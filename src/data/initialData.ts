import { User, Caisse, Mouvement, Pret, Reunion, Tontine, Distribution, Exercice, Parametres, Presence } from '../types';

export const initialUsers: User[] = [
  { id: 'u1', nom: 'Diallo', prenom: 'Aminata', telephone: '+221 77 123 45 67', email: 'aminata@tontine.pro', role: 'admin', actif: true, dateInscription: '2024-01-15', rangTontine: 1 },
  { id: 'u2', nom: 'Ndiaye', prenom: 'Fatou', telephone: '+221 77 234 56 78', email: 'fatou@tontine.pro', role: 'presidente', actif: true, dateInscription: '2024-01-15', rangTontine: 2 },
  { id: 'u3', nom: 'Sow', prenom: 'Mariama', telephone: '+221 77 345 67 89', email: 'mariama@tontine.pro', role: 'tresoriere', actif: true, dateInscription: '2024-02-01', rangTontine: 3 },
  { id: 'u4', nom: 'Ba', prenom: 'Aissatou', telephone: '+221 77 456 78 90', email: 'aissatou@tontine.pro', role: 'secretaire', actif: true, dateInscription: '2024-02-10', rangTontine: 4 },
  { id: 'u5', nom: 'Diop', prenom: 'Khadija', telephone: '+221 77 567 89 01', email: 'khadija@tontine.pro', role: 'membre', actif: true, dateInscription: '2024-03-01', rangTontine: 5 },
  { id: 'u6', nom: 'Fall', prenom: 'Rama', telephone: '+221 77 678 90 12', email: 'rama@tontine.pro', role: 'membre', actif: true, dateInscription: '2024-03-15', rangTontine: 6 },
  { id: 'u7', nom: 'Sarr', prenom: 'Ndèye', telephone: '+221 77 789 01 23', email: 'ndeye@tontine.pro', role: 'membre', actif: false, dateInscription: '2024-01-20', rangTontine: 7 },
  { id: 'u8', nom: 'Gueye', prenom: 'Coumba', telephone: '+221 77 890 12 34', email: 'coumba@tontine.pro', role: 'membre', actif: true, dateInscription: '2024-04-01', rangTontine: 8 }
];

export const initialCaisses: Caisse[] = [
  { id: 'c1', nom: 'Caisse Principale', description: 'Caisse principale pour les cotisations mensuelles', type: 'autre', solde: 1250000, dateCreation: '2024-01-15', actif: true },
  { id: 'c2', nom: 'Caisse Épargne', description: 'Caisse d\'épargne collective pour les projets futurs', type: 'epargne', solde: 750000, dateCreation: '2024-02-01', actif: true },
  { id: 'c3', nom: 'Caisse Solidarité', description: 'Caisse pour les aides d\'urgence et événements sociaux', type: 'secours', solde: 320000, dateCreation: '2024-03-01', actif: true }
];

export const initialMouvements: Mouvement[] = [
  { id: 'm1', type: 'cotisation', categorie: 'entree', montant: 25000, description: 'Cotisation mensuelle - Janvier 2025', caisseId: 'c1', membreId: 'u2', date: '2025-01-05', statut: 'valide', validePar: 'u1', dateValidation: '2025-01-05' },
  { id: 'm2', type: 'cotisation', categorie: 'entree', montant: 25000, description: 'Cotisation mensuelle - Janvier 2025', caisseId: 'c1', membreId: 'u3', date: '2025-01-05', statut: 'valide', validePar: 'u1', dateValidation: '2025-01-06' },
  { id: 'm3', type: 'epargne', categorie: 'entree', montant: 50000, description: 'Épargne collective - Janvier', caisseId: 'c2', membreId: 'u5', date: '2025-01-10', statut: 'valide', validePar: 'u3', dateValidation: '2025-01-10' },
  { id: 'm4', type: 'depense', categorie: 'sortie', montant: 15000, description: 'Frais de location salle réunion', caisseId: 'c1', date: '2025-01-12', statut: 'valide', validePar: 'u1', dateValidation: '2025-01-12' },
  { id: 'm5', type: 'penalite', categorie: 'entree', montant: 5000, description: 'Pénalité retard cotisation - Décembre', caisseId: 'c1', membreId: 'u6', date: '2025-01-08', statut: 'valide', validePar: 'u4', dateValidation: '2025-01-08' },
  { id: 'm6', type: 'distribution', categorie: 'sortie', montant: 200000, description: 'Distribution tontine - Rang #3', caisseId: 'c1', membreId: 'u5', date: '2025-01-20', statut: 'valide', validePar: 'u1', dateValidation: '2025-01-20' },
  { id: 'm7', type: 'don', categorie: 'entree', montant: 100000, description: 'Don de Mme Diop pour la caisse solidarité', caisseId: 'c3', membreId: 'u5', date: '2025-01-25', statut: 'valide', validePar: 'u2', dateValidation: '2025-01-25' },
  { id: 'm8', type: 'cotisation', categorie: 'entree', montant: 25000, description: 'Cotisation mensuelle - Février 2025', caisseId: 'c1', membreId: 'u2', date: '2025-02-05', statut: 'valide', validePar: 'u1', dateValidation: '2025-02-05' },
  { id: 'm9', type: 'remboursement', categorie: 'entree', montant: 50000, description: 'Remboursement prêt - 1ère échéance', caisseId: 'c1', membreId: 'u6', date: '2025-02-10', statut: 'valide', validePar: 'u3', dateValidation: '2025-02-10' },
  { id: 'm10', type: 'cotisation', categorie: 'entree', montant: 25000, description: 'Cotisation mensuelle - Février 2025', caisseId: 'c1', membreId: 'u8', date: '2025-02-05', statut: 'en_attente' },
  { id: 'm11', type: 'depense', categorie: 'sortie', montant: 8000, description: 'Achat fournitures bureau', caisseId: 'c1', date: '2025-02-12', statut: 'rejete', motifRejet: 'Facture non conforme' },
  { id: 'm12', type: 'interet', categorie: 'entree', montant: 15000, description: 'Intérêts générés - Prêt Rama', caisseId: 'c1', date: '2025-02-15', statut: 'valide', validePar: 'u1', dateValidation: '2025-02-15' }
];

export const initialPrets: Pret[] = [
  {
    id: 'p1', membreId: 'u6', montant: 200000, montantRestant: 150000, motif: 'Achat matériel commercial',
    tauxInteret: 5, dateDemande: '2025-01-10', dateApprobation: '2025-01-12', dateEcheance: '2025-07-12',
    statut: 'en_cours', approuvePar: 'u1', interetsGeneres: 10000,
    remboursements: [{ id: 'r1', pretId: 'p1', montant: 50000, date: '2025-02-10', note: 'Premier remboursement' }]
  },
  {
    id: 'p2', membreId: 'u8', montant: 150000, montantRestant: 150000, motif: 'Frais médicaux urgents',
    tauxInteret: 5, dateDemande: '2025-02-15', dateEcheance: '2025-08-15',
    statut: 'en_attente', interetsGeneres: 0, remboursements: []
  },
  {
    id: 'p3', membreId: 'u5', montant: 100000, montantRestant: 0, motif: 'Investissement commerce',
    tauxInteret: 5, dateDemande: '2024-10-01', dateApprobation: '2024-10-03', dateEcheance: '2025-01-03',
    statut: 'rembourse', approuvePar: 'u1', interetsGeneres: 5000,
    remboursements: [
      { id: 'r2', pretId: 'p3', montant: 50000, date: '2024-11-03' },
      { id: 'r3', pretId: 'p3', montant: 50000, date: '2024-12-03' }
    ]
  }
];

const presencesReunion1: Presence[] = [
  { membreId: 'u1', present: true, cotisationPayee: true, montantCotise: 25000 },
  { membreId: 'u2', present: true, cotisationPayee: true, montantCotise: 25000 },
  { membreId: 'u3', present: true, cotisationPayee: true, montantCotise: 25000 },
  { membreId: 'u4', present: true, cotisationPayee: true, montantCotise: 25000 },
  { membreId: 'u5', present: true, cotisationPayee: true, montantCotise: 25000 },
  { membreId: 'u6', present: false, cotisationPayee: false, montantCotise: 0 },
  { membreId: 'u8', present: true, cotisationPayee: true, montantCotise: 25000 }
];

export const initialReunions: Reunion[] = [
  {
    id: 're1', titre: 'Réunion mensuelle - Janvier', date: '2025-01-20', heure: '15:00',
    lieu: 'Salle communautaire, Médina', description: 'Réunion mensuelle ordinaire avec distribution de tontine',
    ordreDuJour: ['Lecture PV précédent', 'Cotisations', 'Distribution tontine', 'Demandes de prêt', 'Questions diverses'],
    decisions: ['Distribution de 200 000 FCFA à Khadija (rang #3)', 'Approbation du prêt de 200 000 FCFA pour Rama', 'Cotisation mensuelle fixée à 25 000 FCFA'],
    compteRendu: 'La réunion s\'est déroulée dans de bonnes conditions. 6 membres présents sur 7. La distribution a été effectuée au profit de Khadija Diop.',
    presences: presencesReunion1, totalCotisations: 125000, totalDepenses: 15000,
    statut: 'terminee', distributionMontant: 200000, exerciceId: 'ex1'
  },
  {
    id: 're2', titre: 'Réunion mensuelle - Février', date: '2025-02-20', heure: '15:00',
    lieu: 'Salle communautaire, Médina', description: 'Réunion mensuelle ordinaire',
    ordreDuJour: ['Cotisations', 'Suivi des prêts', 'Préparation AG'],
    decisions: [], compteRendu: '', presences: [], totalCotisations: 0, totalDepenses: 0,
    statut: 'en_cours', exerciceId: 'ex1'
  },
  {
    id: 're3', titre: 'Assemblée Générale Annuelle', date: '2025-03-15', heure: '10:00',
    lieu: 'Centre culturel, Dakar', description: 'Bilan annuel et élections pour le nouveau bureau',
    ordreDuJour: ['Rapport moral', 'Rapport financier', 'Élections', 'Projets 2026'],
    decisions: [], compteRendu: '', presences: [], totalCotisations: 0, totalDepenses: 0,
    statut: 'planifiee', exerciceId: 'ex1'
  }
];

export const initialTontines: Tontine[] = [
  {
    id: 't1', nom: 'Tontine Mensuelle 2025', description: 'Cycle mensuel de tontine pour l\'année 2025',
    montantParRang: 200000, frequence: 'mensuel', dateDebut: '2025-01-20', statut: 'en_cours',
    cycleActuel: 1, exerciceId: 'ex1',
    rangs: [
      { rang: 1, membreId: 'u1', datePrevue: '2025-01-20', dateEffective: '2025-01-20', montantRecu: 200000, statut: 'recu' },
      { rang: 2, membreId: 'u2', datePrevue: '2025-02-20', montantRecu: 0, statut: 'en_attente' },
      { rang: 3, membreId: 'u3', datePrevue: '2025-03-20', montantRecu: 0, statut: 'en_attente' },
      { rang: 4, membreId: 'u4', datePrevue: '2025-04-20', montantRecu: 0, statut: 'en_attente' },
      { rang: 5, membreId: 'u5', datePrevue: '2025-05-20', montantRecu: 0, statut: 'en_attente' },
      { rang: 6, membreId: 'u6', datePrevue: '2025-06-20', montantRecu: 0, statut: 'en_attente' },
      { rang: 7, membreId: 'u8', datePrevue: '2025-07-20', montantRecu: 0, statut: 'en_attente' }
    ]
  }
];

export const initialDistributions: Distribution[] = [
  { id: 'd1', type: 'tontine', montant: 200000, beneficiaireId: 'u1', date: '2025-01-20', motif: 'Tontine Rang #1', statut: 'effectuee' },
  { id: 'd2', type: 'interet_pret', montant: 5000, beneficiaireId: 'u5', date: '2025-01-05', motif: 'Intérêts prêt remboursé', source: 'p3', statut: 'effectuee' },
  { id: 'd3', type: 'interet_pret', montant: 3000, beneficiaireId: 'u6', date: '2025-02-15', motif: 'Intérêts prêt en cours', source: 'p1', statut: 'prevue' }
];

export const initialExercices: Exercice[] = [
  { id: 'ex1', annee: 2025, dateOuverture: '2025-01-01', statut: 'ouvert' },
  { id: 'ex2', annee: 2024, dateOuverture: '2024-01-01', dateCloture: '2024-12-31', statut: 'cloture', soldeCloture: 1850000 }
];

export const initialParametres: Parametres = {
  montantCotisation: 2000,
  penaliteRetard: 500,
  tauxInteretPret: 5,
  dureeMaxPretMois: 3,
  montantMaxPret: 500000,
  frequenceReunion: 'mensuel',
  jourReunion: 'samedi',
  devise: 'FCFA'
};
