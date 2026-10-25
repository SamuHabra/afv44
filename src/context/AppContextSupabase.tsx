import { notifier } from '../lib/notifier';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Caisse, Mouvement, Pret, Remboursement, Reunion, Tontine, Distribution, Exercice, Parametres, StatutMouvement, StatutPret, StatutReunion, StatutTontine, ParticipantTontine, TourTontine, CotisationTontine, TypeAmende, ActionSuivi, AmendeReunion, RapportFinancier, NotificationApp, DistributionInterets, LigneDistributionInterets, SituationMembre, RappelMembre } from '../types';
import { supabase } from '../lib/supabase';
import { repartirInterets, FluxEpargne } from '../lib/prorata';
import { changePassword } from '../lib/auth';
import { appliquerRemboursement } from '../lib/prets';
import { datePourTour, etatTour, miseParticipant, montantPot, ordonnerTours, refusVersement, totalParts } from '../lib/tontine';
import { ResultatAction, cloturerExerciceRpc, ouvrirExerciceRpc, rouvrirExerciceRpc, modifierParametresRpc, modifierRoleRpc, modifierBaremeAmendeRpc } from '../lib/parametres';
import { v4 as uuidv4 } from 'uuid';
import { AppSkeleton } from '../components/Skeleton';
import { definirJeton, jetonExpire } from '../lib/supabase';

interface AppContextType extends AppState {
  login: (telephone: string, password: string) => boolean;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  addMember: (user: Omit<User, 'id' | 'dateInscription'>) => void;
  toggleMemberStatus: (id: string) => void;
  updateMember: (id: string, data: Partial<User>) => void;
  addCaisse: (caisse: Omit<Caisse, 'id' | 'dateCreation' | 'solde'>) => void;
  addMouvement: (mvt: Omit<Mouvement, 'id' | 'statut' | 'date'>) => void;
  validerMouvement: (id: string) => void;
  rejeterMouvement: (id: string, motif: string) => void;
  addPret: (pret: Omit<Pret, 'id' | 'dateDemande' | 'statut' | 'montantRestant' | 'remboursements' | 'interetsGeneres'>) => void;
  approuverPret: (id: string) => void;
  rejeterPret: (id: string) => void;
  addRemboursement: (pretId: string, montant: number, note?: string) => Promise<boolean>;
  addReunion: (reunion: Omit<Reunion, 'id' | 'presences' | 'totalCotisations' | 'totalDepenses'>) => void;
  updateReunion: (id: string, data: Partial<Reunion>) => void;
  togglePresence: (reunionId: string, membreId: string) => void;
  toggleCotisation: (reunionId: string, membreId: string) => void;
  demarrerReunion: (id: string) => void;
  terminerReunion: (id: string, compteRendu: string) => void;
  marquerRetard: (reunionId: string, membreId: string) => void;
  genererRapportFinancier: (reunionId: string) => Promise<RapportFinancier | undefined>;
  addAmende: (reunionId: string, membreId: string, typeAmende: TypeAmende) => Promise<boolean>;
  getAmendesReunion: (reunionId: string) => Promise<AmendeReunion[]>;
  addDecision: (reunionId: string, decision: string) => void;
  addAction: (reunionId: string, action: Omit<ActionSuivi, 'id' | 'fait'>) => void;
  toggleAction: (reunionId: string, actionId: string) => void;
  redigerPV: (reunionId: string, compteRendu: string) => void;
  validerPV: (reunionId: string) => void;
  getProchainHote: () => User | undefined;
  getStatsReunion: (id: string) => { presents: number; absents: number; retards: number; totalAmendes: number; nbDecisions: number; statutPV: string } | undefined;
  getStatsReunions: () => { total: number; tauxPresenceMoyen: number; totalCotisations: number; totalAmendes: number; prochaine?: Reunion };
  getNotifications: () => Promise<NotificationApp[]>;
  marquerNotificationLue: (id: string) => void;
  addTontine: (tontine: Omit<Tontine, 'id' | 'rangs' | 'cycleActuel' | 'statut' | 'participants' | 'tours'>) => void;
  annulerTontine: (id: string) => void;
  inscrireParticipant: (tontineId: string, membreId: string, nbParts?: number) => Promise<boolean>;
  modifierPartsParticipant: (tontineId: string, participantId: string, nbParts: number) => Promise<boolean>;
  retirerParticipant: (tontineId: string, participantId: string) => void;
  definirOrdreParticipants: (tontineId: string, participantIds: string[]) => void;
  demarrerTontine: (id: string) => Promise<boolean>;
  enregistrerCotisationTontine: (tourId: string, participantId: string, reunionId?: string) => Promise<boolean>;
  signalerRetardTontine: (tourId: string, participantId: string) => Promise<boolean>;
  verserTour: (tourId: string) => Promise<boolean>;
  relancerCycle: (tontineId: string) => Promise<boolean>;
  getSoldeTontine: (tontineId: string) => number;
  updateTontine: (id: string, data: Partial<Tontine>) => void;
  getDistributionsInterets: () => Promise<DistributionInterets[]>;
  simulerDistributionInterets: (periodeDebut: string, dateDistribution: string, reservePct?: number) => { soldeCaisseInterets: number; montantTotal: number; lignes: LigneDistributionInterets[] };
  creerDistributionInterets: (periodeDebut: string, dateDistribution: string, reservePct?: number) => Promise<boolean>;
  supprimerDistributionInterets: (id: string) => Promise<void>;
  validerDistributionInterets: (id: string) => Promise<boolean>;
  executerDistributionInterets: (id: string) => Promise<boolean>;
  addDistribution: (dist: Omit<Distribution, 'id' | 'date' | 'statut'>) => void;
  updateDistribution: (id: string, data: Partial<Distribution>) => void;
  cloturerExercice: (id: string, password: string, confirmation: string) => Promise<ResultatAction>;
  ouvrirExercice: (annee: number) => Promise<ResultatAction>;
  rouvrirExercice: (id: string, password: string, motif: string) => Promise<ResultatAction>;
  updateParametres: (data: Partial<Parametres>) => Promise<ResultatAction>;
  changerRole: (membreId: string, role: string) => Promise<ResultatAction>;
  rechargerDonnees: () => Promise<void>;
  modifierBaremeAmende: (code: string, libelle: string, montant: number) => Promise<ResultatAction>;
  getSituationMembre: (exerciceId?: string) => Promise<{ situation?: SituationMembre; erreur?: string }>;
  marquerToutesNotificationsLues: () => Promise<void>;
  modifierMonProfil: (telephone: string, email: string) => Promise<{ ok: boolean; error?: string }>;
  changerMonMotDePasse: (ancien: string, nouveau: string) => Promise<{ ok: boolean; error?: string }>;
  getRappels: () => RappelMembre[];
  getUserById: (id: string) => User | undefined;
  getCaisseById: (id: string) => Caisse | undefined;
  getExerciceActuel: () => Exercice | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Clé localStorage pour la session
const SESSION_KEY = 'tontine_session';

// Fonction pour charger la session depuis localStorage
function loadSession(): User | null {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

// Fonction pour sauvegarder la session dans localStorage
function saveSession(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.error('Erreur sauvegarde session:', error);
  }
}

// Helper pour convertir les données Supabase en types frontend
function mapUser(dbUser: any): User {
  return {
    id: dbUser.id,
    nom: dbUser.nom,
    prenom: dbUser.prenom,
    telephone: dbUser.telephone,
    email: dbUser.email,
    role: dbUser.role,
    actif: dbUser.actif,
    dateInscription: dbUser.date_inscription,
    rangTontine: dbUser.rang_tontine
  };
}

function mapCaisse(dbCaisse: any): Caisse {
  return {
    id: dbCaisse.id,
    nom: dbCaisse.nom,
    description: dbCaisse.description,
    type: dbCaisse.type || 'autre',
    montantAnnuel: dbCaisse.montant_annuel ? Number(dbCaisse.montant_annuel) : undefined,
    solde: Number(dbCaisse.solde),
    dateCreation: dbCaisse.date_creation,
    actif: dbCaisse.actif,
    systeme: dbCaisse.systeme || false
  };
}

function mapMouvement(dbMvt: any): Mouvement {
  return {
    id: dbMvt.id,
    type: dbMvt.type,
    categorie: dbMvt.categorie || (['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(dbMvt.type) ? 'entree' : 'sortie'),
    montant: Number(dbMvt.montant),
    description: dbMvt.description,
    caisseId: dbMvt.caisse_id,
    membreId: dbMvt.membre_id,
    date: dbMvt.date,
    statut: dbMvt.statut,
    validePar: dbMvt.valide_par,
    dateValidation: dbMvt.date_validation,
    motifRejet: dbMvt.motif_rejet,
    evenementType: dbMvt.evenement_type,
    creePar: dbMvt.cree_par,
    reunionId: dbMvt.reunion_id,
    tontineId: dbMvt.tontine_id,
    tontineTourId: dbMvt.tontine_tour_id,
    distributionInteretsId: dbMvt.distribution_interets_id
  };
}

function mapPret(dbPret: any): Pret {
  return {
    id: dbPret.id,
    membreId: dbPret.membre_id,
    montant: Number(dbPret.montant),
    montantRestant: Number(dbPret.montant_restant),
    motif: dbPret.motif,
    tauxInteret: Number(dbPret.taux_interet),
    dateDemande: dbPret.date_demande,
    dateApprobation: dbPret.date_approbation,
    dateEcheance: dbPret.date_echeance,
    statut: dbPret.statut,
    approuvePar: dbPret.approuve_par,
    interetsGeneres: Number(dbPret.interets_generes),
    remboursements: (dbPret.remboursements || []).map((remboursement: any): Remboursement => ({
      id: remboursement.id,
      pretId: remboursement.pret_id,
      montant: Number(remboursement.montant),
      date: remboursement.date,
      note: remboursement.note
    })),
    garantMembreId: dbPret.garant_membre_id,
    garantDescription: dbPret.garant_description,
    dateDernierRemboursement: dbPret.date_dernier_remboursement
  };
}

function mapReunion(dbReunion: any): Reunion {
  return {
    id: dbReunion.id,
    titre: dbReunion.titre,
    date: dbReunion.date,
    heure: dbReunion.heure,
    lieu: dbReunion.lieu,
    description: dbReunion.description,
    ordreDuJour: dbReunion.ordre_du_jour || [],
    decisions: dbReunion.decisions || [],
    compteRendu: dbReunion.compte_rendu || '',
    presences: dbReunion.presences || [],
    totalCotisations: Number(dbReunion.total_cotisations),
    totalDepenses: Number(dbReunion.total_depenses),
    statut: dbReunion.statut,
    distributionMontant: dbReunion.distribution_montant ? Number(dbReunion.distribution_montant) : undefined,
    exerciceId: dbReunion.exercice_id,
    typeReunion: dbReunion.type_reunion || 'presentielle',
    hoteId: dbReunion.hote_id,
    actions: dbReunion.actions || [],
    rapportFinancier: dbReunion.rapport_financier || undefined,
    statutPV: dbReunion.statut_pv || 'non_redige',
    pvRedigePar: dbReunion.pv_redige_par,
    pvValidePar: dbReunion.pv_valide_par,
    datePVValidation: dbReunion.date_pv_validation,
    dateDemarrage: dbReunion.date_demarrage,
    dateFin: dbReunion.date_fin,
    totalAmendes: Number(dbReunion.total_amendes || 0)
  };
}

function mapTontine(dbTontine: any): Tontine {
  const participants: ParticipantTontine[] = (dbTontine.tontine_participants || []).map((p: any) => ({
    id: p.id,
    tontineId: p.tontine_id,
    membreId: p.membre_id,
    nbParts: p.nb_parts,
    ordre: p.ordre ?? undefined,
    dateInscription: p.date_inscription
  }));
  const tours: TourTontine[] = (dbTontine.tontine_tours || [])
    .map((t: any): TourTontine => ({
      id: t.id,
      tontineId: t.tontine_id,
      numero: t.numero,
      participantId: t.participant_id,
      membreId: t.membre_id,
      datePrevue: t.date_prevue,
      dateEffective: t.date_effective ?? undefined,
      montantAttendu: Number(t.montant_attendu),
      montantCollecte: Number(t.montant_collecte),
      montantVerse: Number(t.montant_verse),
      statut: t.statut,
      cotisations: (t.tontine_cotisations || []).map((c: any): CotisationTontine => ({
        id: c.id,
        tourId: c.tour_id,
        participantId: c.participant_id,
        membreId: c.membre_id,
        montant: Number(c.montant),
        statut: c.statut,
        mouvementId: c.mouvement_id ?? undefined,
        datePaiement: c.date_paiement ?? undefined
      }))
    }))
    .sort((a: TourTontine, b: TourTontine) => a.numero - b.numero);

  return {
    id: dbTontine.id,
    nom: dbTontine.nom,
    description: dbTontine.description || '',
    montantParRang: Number(dbTontine.montant_par_rang),
    frequence: dbTontine.frequence,
    dateDebut: dbTontine.date_debut,
    dateFin: dbTontine.date_fin,
    statut: dbTontine.statut,
    rangs: tours.map(t => ({
      rang: t.numero,
      membreId: t.membreId,
      datePrevue: t.datePrevue,
      dateEffective: t.dateEffective,
      montantRecu: t.montantVerse,
      statut: t.statut === 'verse' ? 'recu' : t.statut === 'reporte' ? 'reporte' : 'en_attente'
    })),
    cycleActuel: dbTontine.cycle_actuel,
    exerciceId: dbTontine.exercice_id,
    nbPlacesMax: dbTontine.nb_places_max ?? undefined,
    modeOrdre: dbTontine.mode_ordre || 'tirage',
    participants,
    tours
  };
}

function mapDistribution(dbDist: any): Distribution {
  return {
    id: dbDist.id,
    type: dbDist.type,
    montant: Number(dbDist.montant),
    beneficiaireId: dbDist.beneficiaire_id,
    date: dbDist.date,
    motif: dbDist.motif,
    source: dbDist.source,
    statut: dbDist.statut
  };
}

function mapExercice(dbEx: any): Exercice {
  return {
    id: dbEx.id,
    annee: dbEx.annee,
    dateOuverture: dbEx.date_ouverture,
    dateCloture: dbEx.date_cloture,
    statut: dbEx.statut,
    soldeCloture: dbEx.solde_cloture ? Number(dbEx.solde_cloture) : undefined
  };
}

function mapParametres(dbParams: any): Parametres {
  return {
    montantCotisation: Number(dbParams.montant_cotisation),
    penaliteRetard: Number(dbParams.penalite_retard),
    tauxInteretPret: Number(dbParams.taux_interet_pret),
    dureeMaxPretMois: dbParams.duree_max_pret_mois,
    montantMaxPret: Number(dbParams.montant_max_pret),
    frequenceReunion: dbParams.frequence_reunion,
    jourReunion: dbParams.jour_reunion,
    devise: dbParams.devise
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: loadSession(), // Charger la session au démarrage
    users: [],
    caisses: [],
    mouvements: [],
    prets: [],
    reunions: [],
    tontines: [],
    distributions: [],
    exercices: [],
    parametres: {
      montantCotisation: 2000,
      penaliteRetard: 500,
      tauxInteretPret: 5,
      dureeMaxPretMois: 3,
      montantMaxPret: 500000,
      frequenceReunion: 'mensuel',
      jourReunion: 'samedi',
      devise: 'FCFA'
    }
  });
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Charger toutes les données depuis Supabase
  // Sans session, on n'interroge pas la base : l'écran de connexion s'affiche directement
  useEffect(() => {
    if (loadSession()) loadData();
    else setLoading(false);
  }, []);

  // Session expirée : retour à l'écran de connexion avec un message
  const terminerSession = (raison: 'expiree' | 'refusee') => {
    saveSession(null);
    definirJeton(null);
    try { sessionStorage.setItem('afmey_session_terminee', raison); } catch { /* stockage indisponible */ }
    setState(prev => ({ ...prev, currentUser: null }));
  };

  useEffect(() => {
    const id = setInterval(() => { if (jetonExpire()) terminerSession('expiree'); }, 60_000);
    return () => clearInterval(id);
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, caissesRes, mouvementsRes, pretsRes, reunionsRes, tontinesRes, distributionsRes, exercicesRes, parametresRes] = await Promise.all([
        supabase.from('users').select('id, nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine'),
        supabase.from('caisses').select('*'),
        supabase.from('mouvements').select('*'),
        supabase.from('prets').select('*, remboursements(*)'),
        supabase.from('reunions').select('*'),
        supabase.from('tontines').select('*, tontine_participants(*), tontine_tours(*, tontine_cotisations(*))'),
        supabase.from('distributions').select('*'),
        supabase.from('exercices').select('*'),
        supabase.from('parametres').select('*').limit(1)
      ]);

      // Vérifier les erreurs de connexion
      const errors = [usersRes.error, caissesRes.error, mouvementsRes.error, pretsRes.error, reunionsRes.error, tontinesRes.error, distributionsRes.error, exercicesRes.error, parametresRes.error].filter(Boolean);

      if (errors.length > 0) {
        console.error('❌ Erreur de connexion à Supabase:', errors[0]);
        throw new Error(`Erreur Supabase: ${errors[0]?.message || 'Connexion échouée'}`);
      }

      // Vérifier si Supabase est vide (schéma non exécuté)
      const isSupabaseEmpty = !usersRes.data || usersRes.data.length === 0;

      if (isSupabaseEmpty) {
        console.error('❌ Supabase est vide. Veuillez exécuter le schéma SQL.');
        throw new Error('Base de données vide. Exécutez supabase/schema.sql dans Supabase SQL Editor.');
      }

      // Charger les données depuis Supabase
      const mappedUsers = (usersRes.data || []).map(mapUser);

      setState(prev => {
        // Vérifier si la session est toujours valide
        let currentUser = prev.currentUser;
        if (currentUser) {
          const freshUser = mappedUsers.find(u => u.id === currentUser!.id && u.actif);
          if (freshUser) {
            currentUser = freshUser; // Mettre à jour avec les données fraîches
            saveSession(freshUser);
          } else {
            currentUser = null; // Utilisateur supprimé ou désactivé
            saveSession(null);
          }
        }

        return {
          ...prev,
          currentUser,
          users: mappedUsers,
          caisses: (caissesRes.data || []).map(mapCaisse),
          mouvements: (mouvementsRes.data || []).map(mapMouvement),
          prets: (pretsRes.data || []).map(mapPret),
          reunions: (reunionsRes.data || []).map(mapReunion),
          tontines: (tontinesRes.data || []).map(mapTontine),
          distributions: (distributionsRes.data || []).map(mapDistribution),
          exercices: (exercicesRes.data || []).map(mapExercice),
          parametres: parametresRes.data && parametresRes.data.length > 0 ? mapParametres(parametresRes.data[0]) : prev.parametres
        };
      });
    } catch (error: any) {
      console.error('❌ Erreur de chargement:', error);
      if (/JWT|permission denied|row-level security|401/i.test(String(error?.message))) {
        // Jeton refusé ou expiré : on redemande la connexion plutôt que d'afficher une panne
        terminerSession('refusee');
      } else {
        setConnectionError(error.message || 'Impossible de se connecter à Supabase');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (telephone: string, _password: string): boolean => {
    const user = state.users.find(u => u.telephone === telephone && u.actif);
    if (user) {
      saveSession(user); // Sauvegarder dans localStorage
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  };

  const logout = () => {
    definirJeton(null);
    saveSession(null); // Supprimer du localStorage
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const setCurrentUser = (user: User | null) => {
    // La connexion renvoie une ligne brute de la base : on la convertit au format de l'application
    const normalise = user && (user as any).date_inscription ? mapUser(user) : user;
    saveSession(normalise); // Sauvegarder dans localStorage
    setState(prev => ({ ...prev, currentUser: normalise }));
    // Les données ne sont chargées qu'une fois la personne connectée
    if (normalise) {
      setLoading(true);
      loadData();
    }
  };

  const addMember = async (userData: Omit<User, 'id' | 'dateInscription'>) => {
    const { data, error } = await supabase
      .from('users')
      .insert({ ...userData, date_inscription: new Date().toISOString() })
      .select('id, nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine')
      .single();
    if (!error && data) {
      setState(prev => ({ ...prev, users: [...prev.users, mapUser(data)] }));
    }
  };

  const toggleMemberStatus = async (id: string) => {
    const user = state.users.find(u => u.id === id);
    if (!user) return;
    const { error } = await supabase.from('users').update({ actif: !user.actif }).eq('id', id);
    if (!error) {
      setState(prev => ({ ...prev, users: prev.users.map(u => u.id === id ? { ...u, actif: !u.actif } : u) }));
    }
  };

  const updateMember = async (id: string, data: Partial<User>) => {
    const { error } = await supabase.from('users').update(data).eq('id', id);
    if (!error) {
      setState(prev => ({ ...prev, users: prev.users.map(u => u.id === id ? { ...u, ...data } : u) }));
    }
  };

  const addCaisse = async (caisseData: Omit<Caisse, 'id' | 'dateCreation' | 'solde'>) => {

    const insertData = {
      nom: caisseData.nom,
      description: caisseData.description,
      type: caisseData.type || 'autre',
      montant_annuel: caisseData.montantAnnuel || null,
      solde: 0,
      actif: caisseData.actif !== false,
      systeme: caisseData.systeme || false,
      date_creation: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('caisses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur insertion caisse:', error);
      notifier(`Erreur lors de la création de la caisse: ${error.message}`);
      return;
    }

    if (data) {
      // Recharger toutes les données pour s'assurer que la caisse apparaît
      await loadData();
    }
  };

  const addMouvement = async (mvt: Omit<Mouvement, 'id' | 'statut' | 'date'>) => {
    const { data, error } = await supabase
      .from('mouvements')
      .insert({
        type: mvt.type,
        categorie: mvt.categorie,
        montant: mvt.montant,
        description: mvt.description,
        caisse_id: mvt.caisseId,
        membre_id: mvt.membreId,
        date: new Date().toISOString(),
        statut: 'en_attente',
        evenement_type: mvt.evenementType,
        cree_par: state.currentUser?.id,
        // Pendant une séance, le mouvement est rattaché à la réunion en cours
        reunion_id: mvt.reunionId || state.reunions.find(r => r.statut === 'en_cours')?.id || null,
        tontine_id: mvt.tontineId || null,
        tontine_tour_id: mvt.tontineTourId || null
      })
      .select()
      .single();
    if (!error && data) {
      setState(prev => ({ ...prev, mouvements: [...prev.mouvements, mapMouvement(data)] }));
      if (data.reunion_id) {
        await recalculerTotauxReunion(data.reunion_id);
        await loadData();
      }
    }
  };

  const validerMouvement = async (id: string) => {
    if (!state.currentUser) return;
    const mvt = state.mouvements.find(m => m.id === id);
    if (!mvt || mvt.statut === 'valide') return;

    const isCredit = ['cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet'].includes(mvt.type);

    // Mettre à jour le mouvement
    const { error: mvtError } = await supabase
      .from('mouvements')
      .update({ statut: 'valide', valide_par: state.currentUser.id, date_validation: new Date().toISOString() })
      .eq('id', id);

    if (mvtError) {
      console.error('Error validating movement:', mvtError);
      return;
    }

    // Mettre à jour le solde de la caisse
    const caisse = state.caisses.find(c => c.id === mvt.caisseId);
    if (caisse) {
      const newSolde = isCredit ? caisse.solde + mvt.montant : caisse.solde - mvt.montant;
      await supabase.from('caisses').update({ solde: newSolde }).eq('id', caisse.id);
    }

    if (mvt.tontineTourId) await recalculerTour(mvt.tontineTourId);

    // Recharger les données
    await loadData();
  };

  const rejeterMouvement = async (id: string, motif: string) => {
    if (!state.currentUser) return;
    const { error } = await supabase
      .from('mouvements')
      .update({ statut: 'rejete', valide_par: state.currentUser.id, date_validation: new Date().toISOString(), motif_rejet: motif })
      .eq('id', id);
    if (!error) {
      const rejete = state.mouvements.find(m => m.id === id);
      if (rejete?.reunionId) await recalculerTotauxReunion(rejete.reunionId);
      if (rejete?.tontineTourId) await recalculerTour(rejete.tontineTourId);
      await loadData();
    }
  };

  const addPret = async (pretData: Omit<Pret, 'id' | 'dateDemande' | 'statut' | 'montantRestant' | 'remboursements' | 'interetsGeneres'>) => {
    const { data, error } = await supabase
      .from('prets')
      .insert({
        membre_id: pretData.membreId,
        montant: pretData.montant,
        motif: pretData.motif,
        taux_interet: pretData.tauxInteret,
        date_echeance: pretData.dateEcheance,
        date_demande: new Date().toISOString(),
        statut: 'en_attente',
        montant_restant: pretData.montant,
        interets_generes: 0,
        garant_membre_id: pretData.garantMembreId,
        garant_description: pretData.garantDescription
      })
      .select()
      .single();
    if (!error && data) {
      await loadData();
    }
  };

  const approuverPret = async (id: string) => {
    if (!state.currentUser) return;
    const { error } = await supabase
      .from('prets')
      .update({ statut: 'approuve', date_approbation: new Date().toISOString(), approuve_par: state.currentUser.id })
      .eq('id', id);
    if (!error) await loadData();
  };

  const rejeterPret = async (id: string) => {
    const { error } = await supabase.from('prets').update({ statut: 'rejete' }).eq('id', id);
    if (!error) await loadData();
  };

  const addRemboursement = async (pretId: string, montant: number, note?: string) => {
    const pret = state.prets.find(p => p.id === pretId);
    if (!pret) {
      console.error('Prêt introuvable pour le remboursement:', pretId);
      return false;
    }

    const totalRembourseAvant = pret.remboursements.reduce((sum, remboursement) => sum + remboursement.montant, 0);
    const { interetsPayes, montantRestant, interetsGeneres } = appliquerRemboursement(pret, totalRembourseAvant, montant);
    const caisseInterets = interetsPayes > 0
      ? state.caisses.find(caisse => caisse.type === 'interets' && caisse.actif)
      : undefined;

    if (interetsPayes > 0 && !caisseInterets) {
      console.error('Aucune caisse active de type "interets" n’est configurée.');
      notifier('Impossible d’enregistrer les intérêts : aucune caisse Intérêts active n’est configurée.');
      return false;
    }

    const { error: remboursementError } = await supabase.from('remboursements').insert({
      pret_id: pretId,
      montant,
      date: new Date().toISOString(),
      note
    });
    if (remboursementError) {
      console.error('Erreur lors de l’enregistrement du remboursement:', remboursementError);
      notifier(`Erreur lors de l’enregistrement du remboursement : ${remboursementError.message}`);
      return false;
    }

    const { error: pretError } = await supabase
      .from('prets')
      .update({
        montant_restant: montantRestant,
        statut: montantRestant <= 0 ? 'rembourse' : 'en_cours',
        interets_generes: interetsGeneres
      })
      .eq('id', pretId);
    if (pretError) {
      console.error('Erreur lors de la mise à jour du prêt:', pretError);
      notifier(`Le remboursement a été enregistré, mais la mise à jour du prêt a échoué : ${pretError.message}`);
      await loadData();
      return true;
    }

    if (caisseInterets && interetsPayes > 0) {
      const { error: mouvementError } = await supabase.from('mouvements').insert({
        type: 'interet',
        montant: interetsPayes,
        description: `Intérêts du prêt - ${pret.motif}`,
        caisse_id: caisseInterets.id,
        membre_id: pret.membreId,
        date: new Date().toISOString(),
        statut: 'valide',
        valide_par: state.currentUser?.id
      });

      if (mouvementError) {
        console.error('Erreur lors de l’ajout des intérêts à la caisse:', mouvementError);
        notifier(`Le remboursement est enregistré, mais l’ajout des intérêts à la caisse a échoué : ${mouvementError.message}`);
        await loadData();
        return true;
      }

      const { error: caisseError } = await supabase
        .from('caisses')
        .update({ solde: caisseInterets.solde + interetsPayes })
        .eq('id', caisseInterets.id);
      if (caisseError) {
        console.error('Erreur lors de la mise à jour du solde de la caisse Intérêts:', caisseError);
        notifier(`Les intérêts sont enregistrés, mais le solde de la caisse n’a pas pu être mis à jour : ${caisseError.message}`);
      }
    }

    await loadData();
    return true;
  };

  // ============= RÉUNIONS =============

  const hasRole = (...roles: string[]) => !!state.currentUser && roles.includes(state.currentUser.role);

  // Recalcule les totaux d'une réunion à partir des mouvements rattachés (hors rejetés)
  const recalculerTotauxReunion = async (reunionId: string) => {
    const { data, error } = await supabase
      .from('mouvements')
      .select('type, categorie, montant, statut')
      .eq('reunion_id', reunionId)
      .neq('statut', 'rejete');
    if (error || !data) return;
    const sum = (rows: any[]) => rows.reduce((s, m) => s + Number(m.montant), 0);
    await supabase.from('reunions').update({
      total_cotisations: sum(data.filter(m => m.type === 'cotisation')),
      total_amendes: sum(data.filter(m => m.type === 'penalite')),
      total_depenses: sum(data.filter(m => m.categorie === 'sortie'))
    }).eq('id', reunionId);
  };

  // Prochain hôte en rotation : membres jamais reçus d'abord, puis celui reçu le plus anciennement
  const getProchainHote = (): User | undefined => {
    const dernier: Record<string, string> = {};
    state.reunions.filter(r => r.hoteId && r.statut !== 'annulee').forEach(r => {
      if (!dernier[r.hoteId!] || r.date > dernier[r.hoteId!]) dernier[r.hoteId!] = r.date;
    });
    return state.users
      .filter(u => u.actif)
      .sort((a, b) => (dernier[a.id] || '').localeCompare(dernier[b.id] || '') || (a.rangTontine ?? 999) - (b.rangTontine ?? 999))[0];
  };

  const addReunion = async (reunionData: Omit<Reunion, 'id' | 'presences' | 'totalCotisations' | 'totalDepenses'>) => {
    if (!hasRole('admin', 'presidente', 'secretaire')) return;
    const actifs = state.users.filter(u => u.actif);
    const presences = actifs.map(u => ({ membreId: u.id, present: false, cotisationPayee: false, montantCotise: 0 }));
    const { data, error } = await supabase
      .from('reunions')
      .insert({
        titre: reunionData.titre,
        date: reunionData.date,
        heure: reunionData.heure,
        lieu: reunionData.lieu,
        description: reunionData.description,
        ordre_du_jour: reunionData.ordreDuJour,
        decisions: reunionData.decisions,
        compte_rendu: reunionData.compteRendu,
        statut: reunionData.statut,
        distribution_montant: reunionData.distributionMontant ?? null,
        exercice_id: reunionData.exerciceId || null,
        type_reunion: 'presentielle',
        hote_id: reunionData.hoteId || null,
        actions: reunionData.actions || [],
        presences,
        total_cotisations: 0,
        total_depenses: 0,
        total_amendes: 0
      })
      .select()
      .single();
    if (error || !data) {
      console.error('Erreur création réunion:', error);
      return;
    }
    // Convocation : notification dans l'application pour chaque membre actif
    const dateTxt = new Date(reunionData.date).toLocaleDateString('fr-FR');
    await supabase.from('notifications').insert(actifs.map(u => ({
      user_id: u.id,
      titre: `Convocation : ${reunionData.titre}`,
      message: `Réunion le ${dateTxt} à ${reunionData.heure} - ${reunionData.lieu}`,
      reunion_id: data.id
    })));
    await loadData();
  };

  const updateReunion = async (id: string, data: Partial<Reunion>) => {
    const dbData: any = {};
    if (data.titre !== undefined) dbData.titre = data.titre;
    if (data.date !== undefined) dbData.date = data.date;
    if (data.heure !== undefined) dbData.heure = data.heure;
    if (data.lieu !== undefined) dbData.lieu = data.lieu;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.statut !== undefined) dbData.statut = data.statut;
    if (data.decisions !== undefined) dbData.decisions = data.decisions;
    if (data.ordreDuJour !== undefined) dbData.ordre_du_jour = data.ordreDuJour;
    if (data.compteRendu !== undefined) dbData.compte_rendu = data.compteRendu;
    if (data.distributionMontant !== undefined) dbData.distribution_montant = data.distributionMontant;
    if (data.hoteId !== undefined) dbData.hote_id = data.hoteId;
    if (data.actions !== undefined) dbData.actions = data.actions;

    const { error } = await supabase.from('reunions').update(dbData).eq('id', id);
    if (!error) await loadData();
  };

  const togglePresence = async (reunionId: string, membreId: string) => {
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut !== 'en_cours' && reunion.statut !== 'terminee') return;
    if (reunion.statutPV === 'valide') return;

    const presences = reunion.presences.map(p =>
      p.membreId === membreId
        ? { ...p, present: !p.present, retard: p.present ? false : p.retard, arrivee: !p.present ? new Date().toISOString() : undefined }
        : p
    );

    await supabase.from('reunions').update({ presences }).eq('id', reunionId);
    await loadData();
  };

  const marquerRetard = async (reunionId: string, membreId: string) => {
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut !== 'en_cours') return;
    const presences = reunion.presences.map(p =>
      p.membreId === membreId ? { ...p, present: true, retard: !p.retard } : p
    );
    await supabase.from('reunions').update({ presences }).eq('id', reunionId);
    await loadData();
  };

  // Pointage de la cotisation du membre. Les montants réels passent par les mouvements (validés par la trésorière).
  const toggleCotisation = async (reunionId: string, membreId: string) => {
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut !== 'en_cours') return;

    const presences = reunion.presences.map(p => {
      if (p.membreId !== membreId) return p;
      const newPayee = !p.cotisationPayee;
      return { ...p, cotisationPayee: newPayee, montantCotise: newPayee ? state.parametres.montantCotisation : 0 };
    });

    await supabase.from('reunions').update({ presences }).eq('id', reunionId);
    await loadData();
  };

  const demarrerReunion = async (id: string) => {
    if (!hasRole('admin', 'presidente', 'secretaire')) return;
    const reunion = state.reunions.find(r => r.id === id);
    if (!reunion || reunion.statut !== 'planifiee') return;
    if (state.reunions.some(r => r.statut === 'en_cours')) {
      notifier('Une réunion est déjà en cours. Terminez-la avant d’en démarrer une autre.');
      return;
    }
    await supabase.from('reunions').update({ statut: 'en_cours', date_demarrage: new Date().toISOString() }).eq('id', id);
    await loadData();
  };

  // État de trésorerie présenté par la trésorière
  const genererRapportFinancier = async (reunionId: string): Promise<RapportFinancier | undefined> => {
    if (!hasRole('admin', 'tresoriere')) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut === 'annulee' || reunion.statutPV === 'valide') return;

    const d = new Date(reunion.date);
    const mois = state.mouvements.filter(m => {
      const md = new Date(m.date);
      return m.statut === 'valide' && md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth();
    });
    const rapport: RapportFinancier = {
      date: new Date().toISOString(),
      presentePar: state.currentUser!.id,
      soldeTotal: state.caisses.reduce((s, c) => s + c.solde, 0),
      caisses: state.caisses.filter(c => c.actif).map(c => ({ caisseId: c.id, nom: c.nom, solde: c.solde })),
      entreesMois: mois.filter(m => m.categorie === 'entree').reduce((s, m) => s + m.montant, 0),
      sortiesMois: mois.filter(m => m.categorie === 'sortie').reduce((s, m) => s + m.montant, 0),
      nbMouvementsMois: mois.length
    };
    const { error } = await supabase.from('reunions').update({ rapport_financier: rapport }).eq('id', reunionId);
    if (error) return;
    await loadData();
    return rapport;
  };

  // Amende saisie pendant la séance : montant selon le barème, mouvement en attente de validation
  const addAmende = async (reunionId: string, membreId: string, typeAmende: TypeAmende): Promise<boolean> => {
    if (!hasRole('admin', 'secretaire')) return false;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut !== 'en_cours') return false;
    const caisseAmendes = state.caisses.find(c => c.type === 'amendes');
    if (!caisseAmendes) {
      notifier('Caisse Amendes introuvable');
      return false;
    }
    const membre = state.users.find(u => u.id === membreId);
    const { data: bareme, error: baremeError } = await supabase.from('types_amende').select('*').eq('code', typeAmende).single();
    if (baremeError || !bareme) {
      console.error('Barème d’amende introuvable (migration update-reunions.sql exécutée ?):', baremeError);
      return false;
    }
    const montant = Number(bareme.montant);

    const { data: mvt, error: mvtError } = await supabase.from('mouvements').insert({
      type: 'penalite',
      categorie: 'entree',
      montant,
      description: `Amende ${bareme.libelle} - ${membre ? `${membre.prenom} ${membre.nom}` : ''}`,
      caisse_id: caisseAmendes.id,
      membre_id: membreId,
      date: new Date().toISOString(),
      statut: 'en_attente',
      cree_par: state.currentUser!.id,
      reunion_id: reunionId
    }).select().single();
    if (mvtError || !mvt) {
      console.error('Erreur création du mouvement d’amende:', mvtError);
      return false;
    }

    const { error } = await supabase.from('amendes_reunion').insert({
      reunion_id: reunionId,
      membre_id: membreId,
      type_amende: typeAmende,
      montant,
      mouvement_id: mvt.id,
      cree_par: state.currentUser!.id
    });
    if (error) console.error('Erreur enregistrement amende:', error);

    await recalculerTotauxReunion(reunionId);
    await loadData();
    return !error;
  };

  const getAmendesReunion = async (reunionId: string): Promise<AmendeReunion[]> => {
    const { data } = await supabase.from('amendes_reunion').select('*').eq('reunion_id', reunionId).order('date');
    return (data || []).map(a => ({
      id: a.id,
      reunionId: a.reunion_id,
      membreId: a.membre_id,
      typeAmende: a.type_amende,
      montant: Number(a.montant),
      mouvementId: a.mouvement_id,
      creePar: a.cree_par,
      date: a.date
    }));
  };

  const addDecision = async (reunionId: string, decision: string) => {
    if (!hasRole('admin', 'presidente', 'secretaire') || !decision.trim()) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut === 'annulee' || reunion.statutPV === 'valide') return;
    await supabase.from('reunions').update({ decisions: [...reunion.decisions, decision.trim()] }).eq('id', reunionId);
    await loadData();
  };

  const addAction = async (reunionId: string, action: Omit<ActionSuivi, 'id' | 'fait'>) => {
    if (!hasRole('admin', 'presidente', 'secretaire') || !action.description.trim()) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut === 'annulee') return;
    const actions = [...(reunion.actions || []), { ...action, id: uuidv4(), fait: false }];
    await supabase.from('reunions').update({ actions }).eq('id', reunionId);
    await loadData();
  };

  const toggleAction = async (reunionId: string, actionId: string) => {
    if (!hasRole('admin', 'presidente', 'secretaire')) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion) return;
    const actions = (reunion.actions || []).map(a => a.id === actionId ? { ...a, fait: !a.fait } : a);
    await supabase.from('reunions').update({ actions }).eq('id', reunionId);
    await loadData();
  };

  // PV rédigé par la secrétaire (modifiable tant qu'il n'est pas validé)
  const redigerPV = async (reunionId: string, compteRendu: string) => {
    if (!hasRole('admin', 'secretaire')) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statut === 'annulee' || reunion.statutPV === 'valide') return;
    await supabase.from('reunions').update({
      compte_rendu: compteRendu,
      statut_pv: compteRendu.trim() ? 'redige' : 'non_redige',
      pv_redige_par: state.currentUser!.id
    }).eq('id', reunionId);
    await loadData();
  };

  // PV validé par la présidente
  const validerPV = async (reunionId: string) => {
    if (!hasRole('admin', 'presidente')) return;
    const reunion = state.reunions.find(r => r.id === reunionId);
    if (!reunion || reunion.statutPV !== 'redige') return;
    await supabase.from('reunions').update({
      statut_pv: 'valide',
      pv_valide_par: state.currentUser!.id,
      date_pv_validation: new Date().toISOString()
    }).eq('id', reunionId);
    await loadData();
  };

  // Clôture : archivage automatique (statut terminée + date de fin), totaux recalculés
  const terminerReunion = async (id: string, compteRendu: string) => {
    if (!hasRole('admin', 'presidente', 'secretaire')) return;
    const reunion = state.reunions.find(r => r.id === id);
    if (!reunion || reunion.statut !== 'en_cours') return;
    await recalculerTotauxReunion(id);
    await supabase.from('reunions').update({
      statut: 'terminee',
      date_fin: new Date().toISOString(),
      compte_rendu: compteRendu,
      statut_pv: compteRendu.trim() ? 'redige' : 'non_redige',
      pv_redige_par: compteRendu.trim() ? state.currentUser!.id : null
    }).eq('id', id);
    await loadData();
  };

  const getStatsReunion = (id: string) => {
    const r = state.reunions.find(x => x.id === id);
    if (!r) return undefined;
    return {
      presents: r.presences.filter(p => p.present).length,
      absents: r.presences.filter(p => !p.present).length,
      retards: r.presences.filter(p => p.retard).length,
      totalAmendes: r.totalAmendes || 0,
      nbDecisions: r.decisions.length,
      statutPV: r.statutPV || 'non_redige'
    };
  };

  const getStatsReunions = () => {
    const terminees = state.reunions.filter(r => r.statut === 'terminee');
    const taux = terminees.length === 0 ? 0 : terminees.reduce((s, r) => s + (r.presences.length ? r.presences.filter(p => p.present).length / r.presences.length : 0), 0) / terminees.length * 100;
    const prochaine = state.reunions
      .filter(r => r.statut === 'planifiee')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      total: state.reunions.length,
      tauxPresenceMoyen: Math.round(taux),
      totalCotisations: state.reunions.reduce((s, r) => s + r.totalCotisations, 0),
      totalAmendes: state.reunions.reduce((s, r) => s + (r.totalAmendes || 0), 0),
      prochaine
    };
  };

  const getNotifications = async (): Promise<NotificationApp[]> => {
    if (!state.currentUser) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', state.currentUser.id).order('date', { ascending: false });
    return (data || []).map(n => ({
      id: n.id, userId: n.user_id, titre: n.titre, message: n.message || '', reunionId: n.reunion_id, lu: n.lu, date: n.date, type: n.type, page: n.page
    }));
  };

  const marquerNotificationLue = async (id: string) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id);
  };

  // ============= TONTINES =============

  const rolesBureau = ['admin', 'presidente', 'secretaire', 'tresoriere'];
  const getCaisseTontine = () => state.caisses.find(c => c.type === 'tontine');
  const peutInscrire = (tontine: Tontine) => tontine.statut === 'inscriptions' || tontine.statut === 'planifiee';

  const addTontine = async (tontineData: Omit<Tontine, 'id' | 'rangs' | 'cycleActuel' | 'statut' | 'participants' | 'tours'>) => {
    if (!hasRole('admin', 'presidente')) return;
    const { error } = await supabase.from('tontines').insert({
      nom: tontineData.nom,
      description: tontineData.description,
      montant_par_rang: tontineData.montantParRang,
      frequence: tontineData.frequence,
      date_debut: tontineData.dateDebut,
      statut: 'inscriptions',
      cycle_actuel: 1,
      exercice_id: tontineData.exerciceId || null,
      nb_places_max: tontineData.nbPlacesMax ?? null,
      mode_ordre: tontineData.modeOrdre || 'tirage'
    });
    if (error) {
      console.error('Erreur création tontine:', error);
      notifier(`Création impossible : ${error.message}`);
      return;
    }
    await loadData();
  };

  const updateTontine = async (id: string, data: Partial<Tontine>) => {
    if (!hasRole('admin', 'presidente')) return;
    const dbData: any = {};
    if (data.nom !== undefined) dbData.nom = data.nom;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.statut !== undefined) dbData.statut = data.statut;
    if (data.frequence !== undefined) dbData.frequence = data.frequence;
    if (data.dateDebut !== undefined) dbData.date_debut = data.dateDebut;
    if (data.nbPlacesMax !== undefined) dbData.nb_places_max = data.nbPlacesMax;
    if (data.modeOrdre !== undefined) dbData.mode_ordre = data.modeOrdre;
    const { error } = await supabase.from('tontines').update(dbData).eq('id', id);
    if (!error) await loadData();
  };

  const annulerTontine = async (id: string) => {
    const tontine = state.tontines.find(t => t.id === id);
    if (!hasRole('admin', 'presidente') || !tontine || !peutInscrire(tontine)) return;
    await supabase.from('tontines').update({ statut: 'annulee' }).eq('id', id);
    await loadData();
  };

  // Un membre peut s'inscrire lui-même ; le bureau peut inscrire n'importe quel membre
  const inscrireParticipant = async (tontineId: string, membreId: string, nbParts = 1): Promise<boolean> => {
    const tontine = state.tontines.find(t => t.id === tontineId);
    if (!tontine || !peutInscrire(tontine) || !state.currentUser || nbParts < 1) return false;
    if (!rolesBureau.includes(state.currentUser.role) && state.currentUser.id !== membreId) return false;

    const participants = tontine.participants || [];
    if (participants.some(p => p.membreId === membreId)) {
      notifier('Ce membre est déjà inscrit à cette tontine.');
      return false;
    }
    const partsPrises = participants.reduce((s, p) => s + p.nbParts, 0);
    if (tontine.nbPlacesMax && partsPrises + nbParts > tontine.nbPlacesMax) {
      notifier(`Plus assez de places (${tontine.nbPlacesMax - partsPrises} restantes).`);
      return false;
    }
    const { error } = await supabase.from('tontine_participants').insert({
      tontine_id: tontineId,
      membre_id: membreId,
      nb_parts: nbParts,
      ordre: participants.reduce((m, p) => Math.max(m, p.ordre ?? 0), 0) + 1
    });
    if (error) {
      console.error('Erreur inscription tontine:', error);
      return false;
    }
    await loadData();
    return true;
  };

  const modifierPartsParticipant = async (tontineId: string, participantId: string, nbParts: number): Promise<boolean> => {
    const tontine = state.tontines.find(t => t.id === tontineId);
    const participant = tontine?.participants?.find(p => p.id === participantId);
    if (!tontine || !participant || !peutInscrire(tontine) || nbParts < 1 || !state.currentUser) return false;
    if (!rolesBureau.includes(state.currentUser.role) && state.currentUser.id !== participant.membreId) return false;
    const autres = (tontine.participants || []).filter(p => p.id !== participantId).reduce((s, p) => s + p.nbParts, 0);
    if (tontine.nbPlacesMax && autres + nbParts > tontine.nbPlacesMax) {
      notifier('Pas assez de places disponibles.');
      return false;
    }
    await supabase.from('tontine_participants').update({ nb_parts: nbParts }).eq('id', participantId);
    await loadData();
    return true;
  };

  // Retrait possible uniquement avant le démarrage du jeu
  const retirerParticipant = async (tontineId: string, participantId: string) => {
    const tontine = state.tontines.find(t => t.id === tontineId);
    const participant = tontine?.participants?.find(p => p.id === participantId);
    if (!tontine || !participant || !peutInscrire(tontine) || !state.currentUser) return;
    if (!rolesBureau.includes(state.currentUser.role) && state.currentUser.id !== participant.membreId) return;
    await supabase.from('tontine_participants').delete().eq('id', participantId);
    await loadData();
  };

  const definirOrdreParticipants = async (tontineId: string, participantIds: string[]) => {
    const tontine = state.tontines.find(t => t.id === tontineId);
    if (!tontine || !peutInscrire(tontine) || !hasRole('admin', 'presidente')) return;
    await Promise.all(participantIds.map((id, i) => supabase.from('tontine_participants').update({ ordre: i + 1 }).eq('id', id)));
    await supabase.from('tontines').update({ mode_ordre: 'manuel' }).eq('id', tontineId);
    await loadData();
  };

  // Fige l'ordre de passage et génère les tours + les cotisations attendues
  const demarrerTontine = async (id: string): Promise<boolean> => {
    const tontine = state.tontines.find(t => t.id === id);
    if (!tontine || !peutInscrire(tontine) || !hasRole('admin', 'presidente')) return false;
    const participants = tontine.participants || [];
    if (totalParts(participants) < 2) {
      notifier('Il faut au moins 2 parts pour démarrer la tontine.');
      return false;
    }

    // Une part = un tour
    const slots = ordonnerTours(participants, tontine.modeOrdre === 'manuel' ? 'manuel' : 'tirage');

    const pot = montantPot(tontine.montantParRang, participants);
    const { data: tours, error } = await supabase.from('tontine_tours').insert(
      slots.map((p, i) => ({
        tontine_id: id,
        numero: i + 1,
        participant_id: p.id,
        membre_id: p.membreId,
        date_prevue: datePourTour(tontine.dateDebut, tontine.frequence, i),
        montant_attendu: pot,
        statut: i === 0 ? 'en_cours' : 'a_venir'
      }))
    ).select();
    if (error || !tours) {
      console.error('Erreur génération des tours:', error);
      notifier(`Démarrage impossible : ${error?.message || 'erreur inconnue'}`);
      return false;
    }

    const cotisations = tours.flatMap((t: any) => participants.map(p => ({
      tour_id: t.id,
      participant_id: p.id,
      membre_id: p.membreId,
      montant: miseParticipant(tontine.montantParRang, p)
    })));
    const { error: cotError } = await supabase.from('tontine_cotisations').insert(cotisations);
    if (cotError) {
      console.error('Erreur génération des cotisations:', cotError);
      await supabase.from('tontine_tours').delete().eq('tontine_id', id);
      notifier(`Démarrage impossible : ${cotError.message}`);
      return false;
    }

    await supabase.from('tontines').update({
      statut: 'en_cours',
      date_fin: datePourTour(tontine.dateDebut, tontine.frequence, slots.length - 1)
    }).eq('id', id);
    await loadData();
    return true;
  };

  // Recalcule un tour depuis les mouvements : cotisations payées, pot collecté, versement, passage au tour suivant
  const recalculerTour = async (tourId: string) => {
    const [tourRes, cotRes, mvtRes] = await Promise.all([
      supabase.from('tontine_tours').select('*').eq('id', tourId).single(),
      supabase.from('tontine_cotisations').select('*').eq('tour_id', tourId),
      supabase.from('mouvements').select('id, type, montant, statut, date_validation').eq('tontine_tour_id', tourId)
    ]);
    const tour = tourRes.data;
    if (!tour) return;
    const mvts: any[] = mvtRes.data || [];

    for (const c of cotRes.data || []) {
      if (!c.mouvement_id) continue;
      const m = mvts.find(x => x.id === c.mouvement_id);
      if (m?.statut === 'valide' && c.statut !== 'paye') {
        await supabase.from('tontine_cotisations').update({ statut: 'paye', date_paiement: m.date_validation || new Date().toISOString() }).eq('id', c.id);
      } else if (!m || m.statut === 'rejete') {
        await supabase.from('tontine_cotisations').update({ statut: 'en_attente', mouvement_id: null, date_paiement: null }).eq('id', c.id);
      }
    }

    const { collecte, verse, termine } = etatTour(mvts, Number(tour.montant_attendu));

    await supabase.from('tontine_tours').update({
      montant_collecte: collecte,
      montant_verse: verse,
      ...(termine && tour.statut !== 'verse' ? { statut: 'verse', date_effective: new Date().toISOString() } : {})
    }).eq('id', tourId);

    if (termine && tour.statut !== 'verse') {
      const { data: suivant } = await supabase.from('tontine_tours').select('id').eq('tontine_id', tour.tontine_id).eq('numero', tour.numero + 1).maybeSingle();
      if (suivant) await supabase.from('tontine_tours').update({ statut: 'en_cours' }).eq('id', suivant.id);
      else await supabase.from('tontines').update({ statut: 'terminee' }).eq('id', tour.tontine_id);
    }
  };

  // Mise d'un participant pour le tour en cours : mouvement en attente de validation dans la Caisse Tontine
  const enregistrerCotisationTontine = async (tourId: string, participantId: string, reunionId?: string): Promise<boolean> => {
    if (!hasRole(...rolesBureau)) return false;
    const tontine = state.tontines.find(t => t.tours?.some(tr => tr.id === tourId));
    const tour = tontine?.tours?.find(tr => tr.id === tourId);
    const cotisation = tour?.cotisations.find(c => c.participantId === participantId);
    if (!tontine || !tour || !cotisation || tontine.statut !== 'en_cours' || tour.statut !== 'en_cours') return false;

    const existant = cotisation.mouvementId && state.mouvements.find(m => m.id === cotisation.mouvementId && m.statut !== 'rejete');
    if (existant) {
      notifier('Cette mise est déjà enregistrée.');
      return false;
    }
    const caisse = getCaisseTontine();
    if (!caisse) {
      notifier('Caisse Tontine introuvable');
      return false;
    }
    const membre = state.users.find(u => u.id === cotisation.membreId);
    const rattache = reunionId || state.reunions.find(r => r.statut === 'en_cours')?.id || null;

    const { data: mvt, error } = await supabase.from('mouvements').insert({
      type: 'cotisation',
      categorie: 'entree',
      montant: cotisation.montant,
      description: `Tontine ${tontine.nom} - Tour ${tour.numero} - ${membre ? `${membre.prenom} ${membre.nom}` : ''}`,
      caisse_id: caisse.id,
      membre_id: cotisation.membreId,
      date: new Date().toISOString(),
      statut: 'en_attente',
      cree_par: state.currentUser!.id,
      reunion_id: rattache,
      tontine_id: tontine.id,
      tontine_tour_id: tourId
    }).select().single();
    if (error || !mvt) {
      console.error('Erreur enregistrement de la mise:', error);
      return false;
    }
    await supabase.from('tontine_cotisations').update({ mouvement_id: mvt.id }).eq('id', cotisation.id);
    if (rattache) await recalculerTotauxReunion(rattache);
    await loadData();
    return true;
  };

  // Mise non payée : marquée en retard + amende « Échec cotisation » en attente de validation
  const signalerRetardTontine = async (tourId: string, participantId: string): Promise<boolean> => {
    if (!hasRole('admin', 'secretaire')) return false;
    const tontine = state.tontines.find(t => t.tours?.some(tr => tr.id === tourId));
    const tour = tontine?.tours?.find(tr => tr.id === tourId);
    const cotisation = tour?.cotisations.find(c => c.participantId === participantId);
    if (!tontine || !tour || !cotisation || cotisation.statut !== 'en_attente' || cotisation.mouvementId) return false;
    const caisseAmendes = state.caisses.find(c => c.type === 'amendes');
    if (!caisseAmendes) {
      notifier('Caisse Amendes introuvable');
      return false;
    }
    const { data: bareme } = await supabase.from('types_amende').select('*').eq('code', 'cotisation').single();
    const membre = state.users.find(u => u.id === cotisation.membreId);
    const rattache = state.reunions.find(r => r.statut === 'en_cours')?.id || null;

    await supabase.from('tontine_cotisations').update({ statut: 'en_retard' }).eq('id', cotisation.id);
    if (bareme) {
      await supabase.from('mouvements').insert({
        type: 'penalite',
        categorie: 'entree',
        montant: Number(bareme.montant),
        description: `Amende ${bareme.libelle} - Tontine ${tontine.nom} tour ${tour.numero} - ${membre ? `${membre.prenom} ${membre.nom}` : ''}`,
        caisse_id: caisseAmendes.id,
        membre_id: cotisation.membreId,
        date: new Date().toISOString(),
        statut: 'en_attente',
        cree_par: state.currentUser!.id,
        reunion_id: rattache,
        tontine_id: tontine.id
      });
      if (rattache) await recalculerTotauxReunion(rattache);
    }
    await loadData();
    return true;
  };

  // Versement du pot au bénéficiaire : possible seulement si le pot est complet (cotisations validées)
  const verserTour = async (tourId: string): Promise<boolean> => {
    if (!hasRole('admin', 'tresoriere', 'presidente')) return false;
    const tontine = state.tontines.find(t => t.tours?.some(tr => tr.id === tourId));
    const tour = tontine?.tours?.find(tr => tr.id === tourId);
    if (!tontine || !tour || tour.statut !== 'en_cours') return false;
    const refus = refusVersement(
      tour.montantCollecte, tour.montantAttendu,
      state.mouvements.some(m => m.tontineTourId === tourId && m.type === 'distribution' && m.statut !== 'rejete')
    );
    if (refus) {
      notifier(refus);
      return false;
    }
    const caisse = getCaisseTontine();
    if (!caisse) {
      notifier('Caisse Tontine introuvable');
      return false;
    }
    const beneficiaire = state.users.find(u => u.id === tour.membreId);
    const { error } = await supabase.from('mouvements').insert({
      type: 'distribution',
      categorie: 'sortie',
      montant: tour.montantAttendu,
      description: `Versement tontine ${tontine.nom} - Tour ${tour.numero} - ${beneficiaire ? `${beneficiaire.prenom} ${beneficiaire.nom}` : ''}`,
      caisse_id: caisse.id,
      membre_id: tour.membreId,
      date: new Date().toISOString(),
      statut: 'en_attente',
      cree_par: state.currentUser!.id,
      tontine_id: tontine.id,
      tontine_tour_id: tourId
    });
    if (error) {
      console.error('Erreur versement tontine:', error);
      return false;
    }
    await loadData();
    return true;
  };

  // Nouveau cycle : mêmes paramètres et mêmes participants, ordre à retirer
  const relancerCycle = async (tontineId: string): Promise<boolean> => {
    const tontine = state.tontines.find(t => t.id === tontineId);
    if (!tontine || tontine.statut !== 'terminee' || !hasRole('admin', 'presidente')) return false;
    const cycle = tontine.cycleActuel + 1;
    const { data, error } = await supabase.from('tontines').insert({
      nom: `${tontine.nom.replace(/ - cycle \d+$/, '')} - cycle ${cycle}`,
      description: tontine.description,
      montant_par_rang: tontine.montantParRang,
      frequence: tontine.frequence,
      date_debut: new Date().toISOString(),
      statut: 'inscriptions',
      cycle_actuel: cycle,
      exercice_id: tontine.exerciceId || null,
      nb_places_max: tontine.nbPlacesMax ?? null,
      mode_ordre: tontine.modeOrdre || 'tirage'
    }).select().single();
    if (error || !data) return false;
    const reprises = (tontine.participants || []).map((p, i) => ({ tontine_id: data.id, membre_id: p.membreId, nb_parts: p.nbParts, ordre: i + 1 }));
    if (reprises.length > 0) await supabase.from('tontine_participants').insert(reprises);
    await loadData();
    return true;
  };

  // Solde d'un jeu dans la Caisse Tontine (mouvements validés)
  const getSoldeTontine = (tontineId: string) =>
    state.mouvements
      .filter(m => m.tontineId === tontineId && m.statut === 'valide' && (m.type === 'cotisation' || m.type === 'distribution'))
      .reduce((s, m) => s + (m.categorie === 'entree' ? m.montant : -m.montant), 0);

  // ============= DISTRIBUTION DES INTÉRÊTS =============

  const mapDistributionInterets = (d: any): DistributionInterets => ({
    id: d.id,
    exerciceId: d.exercice_id ?? undefined,
    periodeDebut: d.periode_debut,
    dateDistribution: d.date_distribution,
    soldeCaisseInterets: Number(d.solde_caisse_interets),
    reservePct: Number(d.reserve_pct),
    montantTotal: Number(d.montant_total),
    statut: d.statut,
    creePar: d.cree_par ?? undefined,
    dateCreation: d.date_creation,
    validePar: d.valide_par ?? undefined,
    dateValidation: d.date_validation ?? undefined,
    dateExecution: d.date_execution ?? undefined,
    lignes: (d.distributions_interets_lignes || []).map((l: any): LigneDistributionInterets => ({
      id: l.id,
      distributionId: l.distribution_id,
      membreId: l.membre_id,
      soldeMoyen: Number(l.solde_moyen),
      capitalJours: Number(l.capital_jours),
      partPct: Number(l.part_pct),
      montant: Number(l.montant)
    })).sort((a: LigneDistributionInterets, b: LigneDistributionInterets) => b.montant - a.montant)
  });

  const getDistributionsInterets = async (): Promise<DistributionInterets[]> => {
    const { data, error } = await supabase
      .from('distributions_interets')
      .select('*, distributions_interets_lignes(*)')
      .order('date_creation', { ascending: false });
    if (error) {
      console.error('Erreur chargement des distributions d’intérêts (migration exécutée ?):', error);
      return [];
    }
    return (data || []).map(mapDistributionInterets);
  };

  // Simulation : dépôts et retraits validés des caisses Épargne Individuelle et Scolaire, pondérés par le temps
  const simulerDistributionInterets = (periodeDebut: string, dateDistribution: string, reservePct = 0) => {
    const caisseInterets = state.caisses.find(c => c.type === 'interets' && c.actif);
    const caissesBase = new Set(state.caisses.filter(c => c.type === 'epargne' || c.type === 'scolaire').map(c => c.id));
    const solde = caisseInterets?.solde ?? 0;
    const montantTotal = Math.floor(solde * (1 - reservePct / 100));

    const flux: FluxEpargne[] = state.mouvements
      .filter(m => m.statut === 'valide' && m.membreId && caissesBase.has(m.caisseId))
      .map(m => ({ membreId: m.membreId!, montant: m.categorie === 'entree' ? m.montant : -m.montant, date: m.date }));
    const actifs = new Set(state.users.filter(u => u.actif).map(u => u.id));

    return {
      soldeCaisseInterets: solde,
      montantTotal,
      lignes: repartirInterets(flux, periodeDebut, dateDistribution, montantTotal, actifs) as LigneDistributionInterets[]
    };
  };

  const creerDistributionInterets = async (periodeDebut: string, dateDistribution: string, reservePct = 0): Promise<boolean> => {
    if (!hasRole('admin', 'tresoriere', 'presidente')) return false;
    if (dateDistribution < periodeDebut) {
      notifier('La date de distribution doit être postérieure au début de la période.');
      return false;
    }
    const existantes = await getDistributionsInterets();
    if (existantes.some(d => d.statut !== 'executee')) {
      notifier('Une distribution est déjà en cours. Exécutez-la ou supprimez-la avant d’en créer une autre.');
      return false;
    }
    const sim = simulerDistributionInterets(periodeDebut, dateDistribution, reservePct);
    if (sim.montantTotal <= 0 || sim.lignes.length === 0) {
      notifier('Rien à distribuer : la Caisse Intérêts est vide ou aucun membre n’a d’épargne sur la période.');
      return false;
    }
    const { data, error } = await supabase.from('distributions_interets').insert({
      exercice_id: getExerciceActuel()?.id || null,
      periode_debut: periodeDebut,
      date_distribution: dateDistribution,
      solde_caisse_interets: sim.soldeCaisseInterets,
      reserve_pct: reservePct,
      montant_total: sim.montantTotal,
      statut: 'brouillon',
      cree_par: state.currentUser!.id
    }).select().single();
    if (error || !data) {
      console.error('Erreur création de la distribution:', error);
      notifier(`Création impossible : ${error?.message || 'erreur inconnue'}`);
      return false;
    }
    const { error: ligneError } = await supabase.from('distributions_interets_lignes').insert(
      sim.lignes.map(l => ({
        distribution_id: data.id,
        membre_id: l.membreId,
        solde_moyen: l.soldeMoyen,
        capital_jours: l.capitalJours,
        part_pct: l.partPct,
        montant: l.montant
      }))
    );
    if (ligneError) {
      console.error('Erreur enregistrement des parts:', ligneError);
      await supabase.from('distributions_interets').delete().eq('id', data.id);
      return false;
    }
    return true;
  };

  const supprimerDistributionInterets = async (id: string) => {
    if (!hasRole('admin', 'tresoriere', 'presidente')) return;
    await supabase.from('distributions_interets').delete().eq('id', id).neq('statut', 'executee');
  };

  const soldeCaisseInteretsFrais = async (): Promise<{ id: string; solde: number } | undefined> => {
    const caisse = state.caisses.find(c => c.type === 'interets' && c.actif);
    if (!caisse) return;
    const { data } = await supabase.from('caisses').select('solde').eq('id', caisse.id).single();
    return data ? { id: caisse.id, solde: Number(data.solde) } : undefined;
  };

  // Validation par la présidente : le montant est figé, le solde de la caisse ne doit plus avoir bougé
  const validerDistributionInterets = async (id: string): Promise<boolean> => {
    if (!hasRole('admin', 'presidente')) return false;
    const { data } = await supabase.from('distributions_interets').select('*').eq('id', id).single();
    if (!data || data.statut !== 'brouillon') return false;
    const caisse = await soldeCaisseInteretsFrais();
    if (!caisse || caisse.solde !== Number(data.solde_caisse_interets)) {
      notifier('Le solde de la Caisse Intérêts a changé depuis la simulation. Supprimez ce brouillon et refaites la simulation.');
      return false;
    }
    const { error } = await supabase.from('distributions_interets')
      .update({ statut: 'validee', valide_par: state.currentUser!.id, date_validation: new Date().toISOString() })
      .eq('id', id);
    return !error;
  };

  // Exécution : sortie de la Caisse Intérêts + crédit de l'Épargne Individuelle de chaque membre
  const executerDistributionInterets = async (id: string): Promise<boolean> => {
    if (!hasRole('admin', 'presidente')) return false;
    const { data } = await supabase.from('distributions_interets').select('*, distributions_interets_lignes(*)').eq('id', id).single();
    if (!data || data.statut !== 'validee') return false;
    const distribution = mapDistributionInterets(data);

    const caisseInterets = await soldeCaisseInteretsFrais();
    const caisseEpargne = state.caisses.find(c => c.type === 'epargne' && c.actif);
    if (!caisseInterets || !caisseEpargne) {
      notifier('Caisse Intérêts ou Épargne Individuelle introuvable');
      return false;
    }
    if (caisseInterets.solde !== distribution.soldeCaisseInterets) {
      notifier('Le solde de la Caisse Intérêts a changé depuis la validation. Supprimez cette distribution et refaites la simulation.');
      return false;
    }

    const maintenant = new Date().toISOString();
    const base = (l: LigneDistributionInterets) => ({
      montant: l.montant,
      membre_id: l.membreId,
      date: maintenant,
      statut: 'valide',
      valide_par: state.currentUser!.id,
      date_validation: maintenant,
      cree_par: state.currentUser!.id,
      distribution_interets_id: id
    });
    const lignes = distribution.lignes.filter(l => l.montant > 0);
    const nom = (membreId: string) => { const u = state.users.find(x => x.id === membreId); return u ? `${u.prenom} ${u.nom}` : ''; };

    const { data: sorties, error: sortieError } = await supabase.from('mouvements').insert(lignes.map(l => ({
      ...base(l), type: 'distribution', categorie: 'sortie', caisse_id: caisseInterets.id,
      description: `Distribution des intérêts - ${nom(l.membreId)}`
    }))).select();
    if (sortieError || !sorties) {
      console.error('Erreur sorties de la distribution:', sortieError);
      notifier(`Exécution impossible : ${sortieError?.message || 'erreur inconnue'}`);
      return false;
    }
    const { data: credits, error: creditError } = await supabase.from('mouvements').insert(lignes.map(l => ({
      ...base(l), type: 'epargne', categorie: 'entree', caisse_id: caisseEpargne.id,
      description: `Intérêts reçus (prorata temporis) - ${nom(l.membreId)}`
    }))).select();
    if (creditError || !credits) {
      console.error('Erreur crédits de la distribution:', creditError);
      await supabase.from('mouvements').delete().in('id', sorties.map((m: any) => m.id));
      notifier(`Exécution impossible : ${creditError?.message || 'erreur inconnue'}`);
      return false;
    }

    await Promise.all(lignes.map(l => supabase.from('distributions_interets_lignes').update({
      mouvement_sortie_id: sorties.find((m: any) => m.membre_id === l.membreId)?.id,
      mouvement_credit_id: credits.find((m: any) => m.membre_id === l.membreId)?.id
    }).eq('id', l.id)));

    const total = lignes.reduce((s, l) => s + l.montant, 0);
    const { data: epargneFrais } = await supabase.from('caisses').select('solde').eq('id', caisseEpargne.id).single();
    await supabase.from('caisses').update({ solde: caisseInterets.solde - total }).eq('id', caisseInterets.id);
    await supabase.from('caisses').update({ solde: Number(epargneFrais?.solde ?? caisseEpargne.solde) + total }).eq('id', caisseEpargne.id);
    await supabase.from('distributions_interets').update({ statut: 'executee', date_execution: maintenant }).eq('id', id);

    await loadData();
    return true;
  };

  const addDistribution = async (dist: Omit<Distribution, 'id' | 'date' | 'statut'>) => {
    const { error } = await supabase
      .from('distributions')
      .insert({ ...dist, date: new Date().toISOString(), statut: 'prevue' });
    if (!error) await loadData();
  };

  const updateDistribution = async (id: string, data: Partial<Distribution>) => {
    const { error } = await supabase.from('distributions').update(data).eq('id', id);
    if (!error) await loadData();
  };

  // Cycle de vie de l'exercice : toutes les vérifications sont faites en base (supabase/update-parametres.sql)
  const cloturerExercice = async (id: string, password: string, confirmation: string): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const res = await cloturerExerciceRpc(id, state.currentUser.id, password, confirmation);
    if (res.ok) await loadData();
    return res;
  };

  const ouvrirExercice = async (annee: number): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const res = await ouvrirExerciceRpc(annee, state.currentUser.id);
    if (res.ok) await loadData();
    return res;
  };

  const rouvrirExercice = async (id: string, password: string, motif: string): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const res = await rouvrirExerciceRpc(id, state.currentUser.id, password, motif);
    if (res.ok) await loadData();
    return res;
  };

  const updateParametres = async (data: Partial<Parametres>): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const dbData: any = {};
    if (data.montantCotisation !== undefined) dbData.montant_cotisation = data.montantCotisation;
    if (data.penaliteRetard !== undefined) dbData.penalite_retard = data.penaliteRetard;
    if (data.tauxInteretPret !== undefined) dbData.taux_interet_pret = data.tauxInteretPret;
    if (data.dureeMaxPretMois !== undefined) dbData.duree_max_pret_mois = data.dureeMaxPretMois;
    if (data.montantMaxPret !== undefined) dbData.montant_max_pret = data.montantMaxPret;
    if (data.frequenceReunion !== undefined) dbData.frequence_reunion = data.frequenceReunion;
    if (data.jourReunion !== undefined) dbData.jour_reunion = data.jourReunion;
    if (data.devise !== undefined) dbData.devise = data.devise;

    const res = await modifierParametresRpc(state.currentUser.id, dbData);
    if (res.ok) await loadData();
    return res;
  };

  const changerRole = async (membreId: string, role: string): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const res = await modifierRoleRpc(state.currentUser.id, membreId, role);
    if (res.ok) await loadData();
    return res;
  };

  const modifierBaremeAmende = async (code: string, libelle: string, montant: number): Promise<ResultatAction> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    return modifierBaremeAmendeRpc(state.currentUser.id, code, libelle, montant);
  };

  // ============= MON ESPACE =============

  const getSituationMembre = async (exerciceId?: string): Promise<{ situation?: SituationMembre; erreur?: string }> => {
    if (!state.currentUser) return { erreur: 'Non connecté' };
    const { data, error } = await supabase.rpc('situation_membre', {
      p_membre_id: state.currentUser.id,
      p_exercice_id: exerciceId || null
    });
    if (error) {
      console.error('Erreur situation du membre:', error);
      return { erreur: error.message };
    }
    return { situation: data as SituationMembre };
  };

  const marquerToutesNotificationsLues = async () => {
    if (!state.currentUser) return;
    await supabase.from('notifications').update({ lu: true }).eq('user_id', state.currentUser.id).eq('lu', false);
  };

  const modifierMonProfil = async (telephone: string, email: string): Promise<{ ok: boolean; error?: string }> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const { data, error } = await supabase.rpc('profil_modifier', {
      p_user_id: state.currentUser.id,
      p_telephone: telephone,
      p_email: email
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.ok) return { ok: false, error: data?.error };
    const maj = mapUser(data.user);
    saveSession(maj);
    setState(prev => ({ ...prev, currentUser: maj, users: prev.users.map(u => u.id === maj.id ? maj : u) }));
    return { ok: true };
  };

  const changerMonMotDePasse = async (ancien: string, nouveau: string): Promise<{ ok: boolean; error?: string }> => {
    if (!state.currentUser) return { ok: false, error: 'Non connecté' };
    const res = await changePassword(state.currentUser.id, ancien, nouveau);
    return { ok: res.success, error: res.error };
  };

  // Rappels calculés à partir des données de l'application (échéances, mises dues, réunions proches)
  const getRappels = (): RappelMembre[] => {
    const moi = state.currentUser;
    if (!moi) return [];
    const rappels: RappelMembre[] = [];
    const maintenant = Date.now();
    const jours = (d: string) => Math.ceil((new Date(d).getTime() - maintenant) / 86400000);

    state.prets.filter(p => p.membreId === moi.id && (p.statut === 'en_cours' || p.statut === 'approuve') && p.montantRestant > 0).forEach(p => {
      const j = jours(p.dateEcheance);
      if (j < 0) rappels.push({ id: `pret-${p.id}`, niveau: 'alerte', titre: 'Prêt en retard', message: `L’échéance est dépassée de ${-j} jour(s). Reste dû : ${p.montantRestant.toLocaleString('fr-FR')} ${state.parametres.devise}`, page: 'loans' });
      else if (j <= 7) rappels.push({ id: `pret-${p.id}`, niveau: 'info', titre: 'Échéance de prêt proche', message: `Échéance dans ${j} jour(s). Reste dû : ${p.montantRestant.toLocaleString('fr-FR')} ${state.parametres.devise}`, page: 'loans' });
    });

    state.tontines.filter(t => t.statut === 'en_cours').forEach(t => {
      const tour = t.tours?.find(tr => tr.statut === 'en_cours');
      const mise = tour?.cotisations.find(c => c.membreId === moi.id);
      if (tour && mise && mise.statut !== 'paye' && !mise.mouvementId) {
        rappels.push({ id: `tontine-${tour.id}`, niveau: mise.statut === 'en_retard' ? 'alerte' : 'info', titre: `Tontine ${t.nom}`, message: `Votre mise du tour ${tour.numero} (${mise.montant.toLocaleString('fr-FR')} ${state.parametres.devise}) est attendue.`, page: 'tontine' });
      }
    });

    state.reunions.filter(r => r.statut === 'planifiee' && jours(r.date) >= 0 && jours(r.date) <= 7).forEach(r => {
      rappels.push({ id: `reunion-${r.id}`, niveau: 'info', titre: 'Réunion à venir', message: `${r.titre} le ${new Date(r.date).toLocaleDateString('fr-FR')} à ${r.heure} - ${r.lieu}`, page: 'meetings' });
    });

    return rappels;
  };

  const getUserById = (id: string) => state.users.find(u => u.id === id);
  const getCaisseById = (id: string) => state.caisses.find(c => c.id === id);
  const getExerciceActuel = () => state.exercices.find(e => e.statut === 'ouvert');

  if (loading) {
    return <AppSkeleton />;
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur de connexion</h2>
            <p className="text-gray-600">Impossible de se connecter à la base de données Supabase</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-mono break-all">{connectionError}</p>
          </div>

          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🔧 Solutions :</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Vérifiez que le schéma SQL a été exécuté dans Supabase</li>
                <li>Allez dans <strong>Supabase → SQL Editor</strong></li>
                <li>Exécutez le fichier <code className="bg-blue-100 px-1 rounded">supabase/schema.sql</code></li>
                <li>Rechargez cette page</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              🔄 Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      ...state, login, logout, setCurrentUser, addMember, toggleMemberStatus, updateMember, addCaisse,
      addMouvement, validerMouvement, rejeterMouvement, addPret, approuverPret, rejeterPret,
      addRemboursement, addReunion, updateReunion, togglePresence, toggleCotisation,
      demarrerReunion, terminerReunion, marquerRetard, genererRapportFinancier, addAmende,
      getAmendesReunion, addDecision, addAction, toggleAction, redigerPV, validerPV, getProchainHote,
      getStatsReunion, getStatsReunions, getNotifications, marquerNotificationLue, addTontine, annulerTontine, inscrireParticipant, modifierPartsParticipant,
      retirerParticipant, definirOrdreParticipants, demarrerTontine, enregistrerCotisationTontine, signalerRetardTontine,
      verserTour, relancerCycle, getSoldeTontine, getDistributionsInterets, simulerDistributionInterets,
      creerDistributionInterets, supprimerDistributionInterets, validerDistributionInterets, executerDistributionInterets, updateTontine, addDistribution,
      updateDistribution, cloturerExercice, ouvrirExercice, rouvrirExercice, updateParametres, changerRole, rechargerDonnees: loadData, modifierBaremeAmende,
      getSituationMembre, marquerToutesNotificationsLues, modifierMonProfil, changerMonMotDePasse, getRappels,
      getUserById, getCaisseById, getExerciceActuel
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
