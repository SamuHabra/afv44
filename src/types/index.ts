export type Role = 'admin' | 'presidente' | 'secretaire' | 'tresoriere' | 'commissaire' | 'animatrice' | 'conseillere' | 'membre';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  role: Role;
  actif: boolean;
  dateInscription: string;
  photo?: string;
  rangTontine?: number;
  firstLogin?: boolean;
  passwordChanged?: boolean;
  authId?: string;
}

export type TypeCaisse = 'cassation' | 'charite' | 'secours' | 'epargne' | 'scolaire' | 'amendes' | 'tontine' | 'interets' | 'autre';

export interface Caisse {
  id: string;
  nom: string;
  description: string;
  type: TypeCaisse;
  montantAnnuel?: number;
  solde: number;
  dateCreation: string;
  actif: boolean;
  systeme?: boolean;
}

export type TypeMouvement = 'cotisation' | 'epargne' | 'depense' | 'penalite' | 'don' | 'remboursement' | 'pret' | 'distribution' | 'interet';
export type StatutMouvement = 'en_attente' | 'valide' | 'rejete';
export type CategorieMouvement = 'entree' | 'sortie';
export type TypeEvenement = 'naissance' | 'mariage' | 'promotion' | 'anniversaire' | 'amis_invisibles' | 'deces_membre' | 'deces_enfant' | 'deces_parent' | 'deces_conjoint';
export type CategorieEvenement = 'heureux' | 'triste';

export interface Mouvement {
  id: string;
  type: TypeMouvement;
  categorie: CategorieMouvement;
  montant: number;
  description: string;
  caisseId: string;
  membreId?: string;
  date: string;
  statut: StatutMouvement;
  validePar?: string;
  dateValidation?: string;
  motifRejet?: string;
  evenementType?: TypeEvenement;
  creePar?: string;
  reunionId?: string;
  tontineId?: string;
  tontineTourId?: string;
  distributionInteretsId?: string;
}

export type StatutPret = 'en_attente' | 'approuve' | 'en_cours' | 'rembourse' | 'rejete';

export interface Pret {
  id: string;
  membreId: string;
  montant: number;
  montantRestant: number;
  motif: string;
  tauxInteret: number;
  dateDemande: string;
  dateApprobation?: string;
  dateEcheance: string;
  statut: StatutPret;
  approuvePar?: string;
  remboursements: Remboursement[];
  interetsGeneres: number;
  garantMembreId?: string;
  garantDescription?: string;
  dateDernierRemboursement?: string;
}

export interface Remboursement {
  id: string;
  pretId: string;
  montant: number;
  date: string;
  note?: string;
}

export type StatutReunion = 'planifiee' | 'en_cours' | 'terminee' | 'annulee';

export interface Presence {
  membreId: string;
  present: boolean;
  cotisationPayee: boolean;
  montantCotise: number;
  arrivee?: string;
  retard?: boolean;
}

export type StatutPV = 'non_redige' | 'redige' | 'valide';
export type TypeAmende = 'retard' | 'bavardage' | 'querelle' | 'dresscode' | 'cotisation';

export interface ActionSuivi {
  id: string;
  description: string;
  responsableId?: string;
  echeance?: string;
  fait: boolean;
}

export interface AmendeReunion {
  id: string;
  reunionId: string;
  membreId: string;
  typeAmende: TypeAmende;
  montant: number;
  mouvementId?: string;
  creePar?: string;
  date: string;
}

export interface RapportFinancier {
  date: string;
  presentePar?: string;
  soldeTotal: number;
  caisses: { caisseId: string; nom: string; solde: number }[];
  entreesMois: number;
  sortiesMois: number;
  nbMouvementsMois: number;
}

export interface NotificationApp {
  type?: string;
  page?: string;
  id: string;
  userId: string;
  titre: string;
  message: string;
  reunionId?: string;
  lu: boolean;
  date: string;
}

export interface Reunion {
  id: string;
  titre: string;
  date: string;
  heure: string;
  lieu: string;
  description: string;
  ordreDuJour: string[];
  decisions: string[];
  compteRendu: string;
  presences: Presence[];
  totalCotisations: number;
  totalDepenses: number;
  statut: StatutReunion;
  distributionMontant?: number;
  exerciceId: string;
  typeReunion?: 'presentielle';
  hoteId?: string;
  actions?: ActionSuivi[];
  rapportFinancier?: RapportFinancier;
  statutPV?: StatutPV;
  pvRedigePar?: string;
  pvValidePar?: string;
  datePVValidation?: string;
  dateDemarrage?: string;
  dateFin?: string;
  totalAmendes?: number;
}

export type StatutTontine = 'inscriptions' | 'planifiee' | 'en_cours' | 'terminee' | 'suspendue' | 'annulee';
export type ModeOrdreTontine = 'tirage' | 'manuel';
export type StatutTour = 'a_venir' | 'en_cours' | 'verse' | 'reporte';

export interface ParticipantTontine {
  id: string;
  tontineId: string;
  membreId: string;
  nbParts: number;
  ordre?: number;
  dateInscription: string;
}

export interface CotisationTontine {
  id: string;
  tourId: string;
  participantId: string;
  membreId: string;
  montant: number;
  statut: 'en_attente' | 'paye' | 'en_retard';
  mouvementId?: string;
  datePaiement?: string;
}

export interface TourTontine {
  id: string;
  tontineId: string;
  numero: number;
  participantId: string;
  membreId: string;
  datePrevue: string;
  dateEffective?: string;
  montantAttendu: number;
  montantCollecte: number;
  montantVerse: number;
  statut: StatutTour;
  cotisations: CotisationTontine[];
}

// Vue simplifiée d'un tour (utilisée par le tableau de bord et Mon espace)
export interface RangTontine {
  rang: number;
  membreId: string;
  datePrevue: string;
  dateEffective?: string;
  montantRecu: number;
  statut: 'en_attente' | 'recu' | 'reporte';
}

export interface Tontine {
  id: string;
  nom: string;
  description: string;
  montantParRang: number; // mise par part et par tour
  frequence: 'hebdomadaire' | 'mensuel' | 'bimensuel';
  dateDebut: string;
  dateFin?: string;
  statut: StatutTontine;
  rangs: RangTontine[];
  cycleActuel: number;
  exerciceId: string;
  nbPlacesMax?: number;
  modeOrdre?: ModeOrdreTontine;
  participants?: ParticipantTontine[];
  tours?: TourTontine[];
}

export type StatutDistributionInterets = 'brouillon' | 'validee' | 'executee';

export interface LigneDistributionInterets {
  id?: string;
  distributionId?: string;
  membreId: string;
  soldeMoyen: number;
  capitalJours: number;
  partPct: number;
  montant: number;
}

export interface DistributionInterets {
  id: string;
  exerciceId?: string;
  periodeDebut: string;
  dateDistribution: string;
  soldeCaisseInterets: number;
  reservePct: number;
  montantTotal: number;
  statut: StatutDistributionInterets;
  creePar?: string;
  dateCreation: string;
  validePar?: string;
  dateValidation?: string;
  dateExecution?: string;
  lignes: LigneDistributionInterets[];
}

export interface Distribution {
  id: string;
  type: 'interet_pret' | 'tontine' | 'bonus' | 'dividende';
  montant: number;
  beneficiaireId: string;
  date: string;
  motif: string;
  source?: string;
  statut: 'prevue' | 'effectuee' | 'annulee';
}

export interface Exercice {
  id: string;
  annee: number;
  dateOuverture: string;
  dateCloture?: string;
  statut: 'ouvert' | 'cloture';
  soldeCloture?: number;
}

export interface Parametres {
  montantCotisation: number;
  penaliteRetard: number;
  tauxInteretPret: number;
  dureeMaxPretMois: number;
  montantMaxPret: number;
  frequenceReunion: 'hebdomadaire' | 'mensuel' | 'bimensuel';
  jourReunion: string;
  devise: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  caisses: Caisse[];
  mouvements: Mouvement[];
  prets: Pret[];
  reunions: Reunion[];
  tontines: Tontine[];
  distributions: Distribution[];
  exercices: Exercice[];
  parametres: Parametres;
}

// ===== Mon espace =====

export interface SituationCaisseMembre {
  caisse_id: string;
  nom: string;
  type: TypeCaisse;
  montant_annuel: number | null;
  verse_exercice: number;
  reste_a_payer: number | null;
  solde_membre: number;
}

export interface SituationPretMembre {
  id: string;
  montant: number;
  montant_restant: number;
  taux_interet: number;
  date_echeance: string;
  statut: StatutPret;
  motif: string;
  en_retard: boolean;
}

export interface SituationMembre {
  exercice: { id?: string; annee?: number; debut: string; fin: string };
  caisses: SituationCaisseMembre[];
  prets: SituationPretMembre[];
  total_pret_restant: number;
  presence: { reunions: number; presences: number; retards: number };
  amendes_exercice: number;
  interets_recus: number;
}

export interface RappelMembre {
  id: string;
  niveau: 'info' | 'alerte';
  titre: string;
  message: string;
  page: string;
}
