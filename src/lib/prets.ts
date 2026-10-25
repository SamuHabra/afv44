// Règles d'argent des prêts : fonctions pures (sans accès à la base ni à l'écran), testées dans __tests__/prets.test.ts.

const MS_PAR_MOIS = 1000 * 60 * 60 * 24 * 30;

export interface ConditionsPret {
  montant: number;
  /** Taux d'intérêt par mois, en pourcentage (5 = 5 %). */
  tauxInteret: number;
  dateDemande: string;
  dateEcheance: string;
}

/** Durée du prêt en mois de 30 jours, arrondie au mois supérieur, 1 mois au minimum. */
export function dureeMois(pret: Pick<ConditionsPret, 'dateDemande' | 'dateEcheance'>): number {
  const ecart = new Date(pret.dateEcheance).getTime() - new Date(pret.dateDemande).getTime();
  return Math.max(1, Math.ceil(ecart / MS_PAR_MOIS));
}

/** Intérêts simples : montant × taux mensuel × nombre de mois. */
export function calculerInterets(montant: number, duree: number, tauxInteret: number) {
  const interetsMensuels = montant * (tauxInteret / 100);
  const interetsTotaux = interetsMensuels * duree;
  return { interetsMensuels, interetsTotaux, totalARembourser: montant + interetsTotaux };
}

/** Capital + intérêts dus sur toute la durée du prêt. */
export function totalDu(pret: ConditionsPret): number {
  return calculerInterets(pret.montant, dureeMois(pret), pret.tauxInteret).totalARembourser;
}

/** Ce qu'il reste à payer, jamais négatif. */
export function resteDu(pret: ConditionsPret, dejaRembourse: number): number {
  return Math.max(0, totalDu(pret) - dejaRembourse);
}

/**
 * Effet d'un remboursement : les intérêts sont payés en premier (ils vont à la caisse Intérêts),
 * le reste réduit le capital.
 */
export function appliquerRemboursement(pret: ConditionsPret, dejaRembourse: number, montant: number) {
  const { interetsTotaux } = calculerInterets(pret.montant, dureeMois(pret), pret.tauxInteret);
  const interetsPayes = Math.min(montant, Math.max(0, interetsTotaux - dejaRembourse));
  const totalRembourse = dejaRembourse + montant;
  const montantRestant = Math.max(0, pret.montant + interetsTotaux - totalRembourse);
  return {
    interetsPayes,
    capitalPaye: montant - interetsPayes,
    totalRembourse,
    montantRestant,
    interetsGeneres: Math.min(interetsTotaux, totalRembourse),
    solde: montantRestant <= 0
  };
}

/** Message d'erreur si la demande dépasse les limites des paramètres, sinon undefined (0 = pas de plafond de montant). */
export function verifierDemande(montant: number, duree: number, limites: { montantMaxPret: number; dureeMaxPretMois: number; devise: string }): string | undefined {
  if (!Number.isFinite(montant) || montant <= 0) return 'Veuillez entrer un montant valide';
  if (limites.montantMaxPret > 0 && montant > limites.montantMaxPret) {
    return `Le montant dépasse le maximum autorisé (${limites.montantMaxPret.toLocaleString('fr-FR')} ${limites.devise}).`;
  }
  if (duree > limites.dureeMaxPretMois) return `La durée dépasse le maximum autorisé (${limites.dureeMaxPretMois} mois).`;
  return undefined;
}

/** Date d'échéance (AAAA-MM-JJ) d'un prêt de `duree` mois de 30 jours demandé à `depuis`. */
export function dateEcheance(duree: number, depuis: Date = new Date()): string {
  return new Date(depuis.getTime() + duree * MS_PAR_MOIS).toISOString().split('T')[0];
}
