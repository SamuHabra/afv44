// Répartition des intérêts au prorata temporis (capital-jours)

export interface FluxEpargne {
  membreId: string;
  montant: number; // dépôt > 0, retrait < 0
  date: string;
}

export interface LigneRepartition {
  membreId: string;
  soldeMoyen: number;
  capitalJours: number;
  partPct: number;
  montant: number;
}

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// Jours entiers entre deux dates (calendrier UTC, sans effet d'heure d'été)
export function joursEntre(debut: string | Date, fin: string | Date): number {
  const d = new Date(debut);
  const f = new Date(fin);
  const a = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const b = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
  return Math.round((b - a) / MS_PAR_JOUR);
}

/**
 * Chaque flux compte pour son montant × le nombre de jours restant jusqu'à `fin`.
 * Les flux antérieurs à `debut` forment le solde d'ouverture, compté sur toute la période.
 * Les flux postérieurs à `fin` sont ignorés. Un retrait compte en négatif.
 */
export function calculerCapitalJours(flux: FluxEpargne[], debut: string, fin: string): Map<string, number> {
  const resultat = new Map<string, number>();
  for (const f of flux) {
    if (joursEntre(f.date, fin) < 0) continue;
    const depuis = joursEntre(f.date, debut) > 0 ? debut : f.date;
    const jours = joursEntre(depuis, fin);
    resultat.set(f.membreId, (resultat.get(f.membreId) || 0) + f.montant * jours);
  }
  return resultat;
}

/**
 * Partage `montantTotal` entre les membres selon leurs capital-jours.
 * Montants arrondis à l'unité vers le bas ; le reste va au plus gros bénéficiaire,
 * de sorte que la somme distribuée soit exactement `montantTotal`.
 */
export function repartirInterets(flux: FluxEpargne[], debut: string, fin: string, montantTotal: number, membresEligibles?: Set<string>): LigneRepartition[] {
  const capitaux = calculerCapitalJours(flux, debut, fin);
  const joursPeriode = Math.max(1, joursEntre(debut, fin));
  const retenus = [...capitaux.entries()].filter(([id, cj]) => cj > 0 && (!membresEligibles || membresEligibles.has(id)));
  const total = retenus.reduce((s, [, cj]) => s + cj, 0);
  if (total <= 0 || montantTotal <= 0) return [];

  const lignes: LigneRepartition[] = retenus
    .map(([membreId, cj]) => ({
      membreId,
      soldeMoyen: Math.round(cj / joursPeriode),
      capitalJours: cj,
      partPct: (cj / total) * 100,
      montant: Math.floor((montantTotal * cj) / total)
    }))
    .sort((a, b) => b.capitalJours - a.capitalJours);

  const reste = montantTotal - lignes.reduce((s, l) => s + l.montant, 0);
  lignes[0].montant += reste;
  return lignes;
}
