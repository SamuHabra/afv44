// Règles d'argent de la tontine : fonctions pures, testées dans __tests__/tontine.test.ts.

export type FrequenceTontine = 'hebdomadaire' | 'bimensuel' | 'mensuel';

export interface PartParticipant {
  id: string;
  nbParts: number;
  ordre?: number | null;
}

/** Date du tour n° `index` (0 = premier) à partir de la date de début. */
export function datePourTour(debut: string, frequence: FrequenceTontine, index: number): string {
  const d = new Date(debut);
  if (frequence === 'mensuel') d.setMonth(d.getMonth() + index);
  else d.setDate(d.getDate() + index * (frequence === 'hebdomadaire' ? 7 : 14));
  return d.toISOString();
}

/** Nombre total de parts = nombre de tours. Une part = un tour. */
export const totalParts = (participants: PartParticipant[]) => participants.reduce((s, p) => s + p.nbParts, 0);

/** Pot d'un tour : mise par part × nombre total de parts. */
export const montantPot = (montantParRang: number, participants: PartParticipant[]) => montantParRang * totalParts(participants);

/** Mise attendue d'un participant à chaque tour : mise par part × ses parts. */
export const miseParticipant = (montantParRang: number, p: PartParticipant) => montantParRang * p.nbParts;

/**
 * Ordre de passage : une entrée par part.
 *  • manuel : tours de table dans l'ordre choisi (1re part de chacun, puis 2e part de ceux qui en ont une…) ;
 *  • tirage : mélange, sans deux tours de suite pour la même personne quand c'est possible.
 * `hasard` renvoie un nombre dans [0, 1[ (injecté pour pouvoir tester).
 */
export function ordonnerTours<T extends PartParticipant>(participants: T[], mode: 'manuel' | 'tirage', hasard: () => number = Math.random): T[] {
  const slots: T[] = [];
  if (mode === 'manuel') {
    const ordonnes = [...participants].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));
    const maxParts = Math.max(...ordonnes.map(p => p.nbParts));
    for (let r = 1; r <= maxParts; r++) ordonnes.forEach(p => { if (p.nbParts >= r) slots.push(p); });
    return slots;
  }
  participants.forEach(p => { for (let i = 0; i < p.nbParts; i++) slots.push(p); });
  const aDeuxDeSuite = () => slots.some((s, i) => i > 0 && s.id === slots[i - 1].id);
  // On retire au sort jusqu'à obtenir un ordre sans tours consécutifs. Si c'est impossible (une personne a plus de la moitié
  // des parts), on garde le dernier tirage après le nombre maximal d'essais.
  for (let essai = 0; essai < 500; essai++) {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(hasard() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    if (!aDeuxDeSuite()) break;
  }
  return slots;
}

/** État d'un tour d'après ses mouvements : seuls les mouvements validés comptent. */
export function etatTour(mouvements: { type: string; montant: number | string; statut: string }[], montantAttendu: number) {
  const somme = (type: string) => mouvements.filter(m => m.type === type && m.statut === 'valide').reduce((s, m) => s + Number(m.montant), 0);
  const collecte = somme('cotisation');
  const verse = somme('distribution');
  return { collecte, verse, potComplet: collecte >= montantAttendu, termine: verse >= montantAttendu };
}

/** Message de refus si le versement du pot n'est pas possible, sinon undefined. */
export function refusVersement(montantCollecte: number, montantAttendu: number, versementDejaEnCours: boolean): string | undefined {
  if (montantCollecte < montantAttendu) return 'Le pot n’est pas complet : toutes les mises doivent être validées avant le versement.';
  if (versementDejaEnCours) return 'Un versement est déjà en cours pour ce tour.';
  return undefined;
}
