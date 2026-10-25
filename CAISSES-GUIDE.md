# 🚀 Guide d'Intégration du Module Mouvements

## ⚠️ Important : Comment récupérer les fichiers

Les fichiers ont été créés dans mon environnement virtuel. Vous devez les copier manuellement dans votre projet local.

---

## 📋 Étape 1 : Structure des fichiers à créer

Voici la structure complète que vous devez créer dans votre projet :

```
votre-projet/
├── src/
│   ├── App.tsx                          ← REMPLACER
│   ├── vite-env.d.ts                    ← CRÉER
│   ├── types/
│   │   └── index.ts                     ← CRÉER
│   ├── lib/
│   │   └── supabase.ts                  ← CRÉER
│   ├── context/
│   │   └── AppContextSupabase.tsx       ← CRÉER
│   └── pages/
│       └── Mouvements.tsx               ← CRÉER
└── supabase/
    └── update-mouvements.sql            ← CRÉER
```

---

## 📝 Étape 2 : Copier le contenu des fichiers

### **Fichier 1 : `src/types/index.ts`**

Créez le dossier `src/types/` et le fichier `index.ts` avec le contenu suivant :

```typescript
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
}

export type StatutTontine = 'planifiee' | 'en_cours' | 'terminee' | 'suspendue';

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
  montantParRang: number;
  frequence: 'hebdomadaire' | 'mensuel' | 'bimensuel';
  dateDebut: string;
  dateFin?: string;
  statut: StatutTontine;
  rangs: RangTontine[];
  cycleActuel: number;
  exerciceId: string;
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
```

---

### **Fichier 2 : `src/vite-env.d.ts`**

Créez ce fichier à la racine de `src/` :

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

### **Fichier 3 : `src/lib/supabase.ts`**

Créez le dossier `src/lib/` et le fichier `supabase.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mdizmerhmetwlpmzgndx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaXptZXJobWV0d2xwbXpnbmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MzgwOTQsImV4cCI6MjEwODExNDA5NH0.kBK0f9T47DyAVEb9KuEW5kPah5PtzYnFFJW3ZrFgXNI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### **Fichier 4 : `src/context/AppContextSupabase.tsx`**

Créez le dossier `src/context/` et le fichier `AppContextSupabase.tsx`.

⚠️ **Ce fichier est très long (700+ lignes)**. Je vais vous le fournir en plusieurs parties.

**Partie 1/4 : Imports et helpers de mapping**

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, User, Caisse, Mouvement, Pret, Reunion, Tontine, Distribution, Exercice, Parametres } from '../types';
import { supabase } from '../lib/supabase';

interface AppContextType extends AppState {
  login: (telephone: string, password: string) => boolean;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  addMember: (user: Omit<User, 'id' | 'dateInscription'>) => void;
  toggleMemberStatus: (id: string) => void;
  updateMember: (id: string,  Partial<User>) => void;
  addCaisse: (caisse: Omit<Caisse, 'id' | 'dateCreation' | 'solde'>) => void;
  addMouvement: (mvt: Omit<Mouvement, 'id' | 'statut' | 'date'>) => void;
  validerMouvement: (id: string) => void;
  rejeterMouvement: (id: string, motif: string) => void;
  addPret: (pret: Omit<Pret, 'id' | 'dateDemande' | 'statut' | 'montantRestant' | 'remboursements' | 'interetsGeneres'>) => void;
  approuverPret: (id: string) => void;
  rejeterPret: (id: string) => void;
  addRemboursement: (pretId: string, montant: number, note?: string) => void;
  addReunion: (reunion: Omit<Reunion, 'id' | 'presences' | 'totalCotisations' | 'totalDepenses'>) => void;
  updateReunion: (id: string,  Partial<Reunion>) => void;
  togglePresence: (reunionId: string, membreId: string) => void;
  toggleCotisation: (reunionId: string, membreId: string) => void;
  demarrerReunion: (id: string) => void;
  terminerReunion: (id: string, compteRendu: string) => void;
  addTontine: (tontine: Omit<Tontine, 'id' | 'rangs' | 'cycleActuel'>) => void;
  updateTontine: (id: string,  Partial<Tontine>) => void;
  addDistribution: (dist: Omit<Distribution, 'id' | 'date' | 'statut'>) => void;
  updateDistribution: (id: string,  Partial<Distribution>) => void;
  cloturerExercice: (id: string) => void;
  ouvrirExercice: (annee: number) => void;
  updateParametres: ( Partial<Parametres>) => void;
  getUserById: (id: string) => User | undefined;
  getCaisseById: (id: string) => Caisse | undefined;
  getExerciceActuel: () => Exercice | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SESSION_KEY = 'tontine_session';

function loadSession(): User | null {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

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
    creePar: dbMvt.cree_par
  };
}

// ... (continuer avec les autres fonctions de mapping et le provider)
```

**⚠️ Le fichier complet fait 700+ lignes. Pour l'obtenir :**

1. Ouvrez le fichier `src/context/AppContextSupabase.tsx` dans mon environnement
2. Copiez tout le contenu
3. Collez-le dans votre projet local

Ou demandez-moi de vous le fournir en plusieurs messages.

---

### **Fichier 5 : `src/pages/Mouvements.tsx`**

Ce fichier existe déjà dans votre projet. **Remplacez-le** par la nouvelle version.

**⚠️ Le fichier fait 600+ lignes.** Pour l'obtenir :

1. Ouvrez le fichier `src/pages/Mouvements.tsx` dans mon environnement
2. Copiez tout le contenu
3. Collez-le dans votre projet local

---

### **Fichier 6 : `src/App.tsx`**

**Remplacez** le contenu de `src/App.tsx` par la nouvelle version fournie.

---

### **Fichier 7 : `supabase/update-mouvements.sql`**

Créez le dossier `supabase/` et le fichier `update-mouvements.sql` :

```sql
-- ============================================
-- 📊 MISE À JOUR TABLE MOUVEMENTS
-- ============================================

-- ÉTAPE 1 : Ajouter les colonnes manquantes
ALTER TABLE mouvements
ADD COLUMN IF NOT EXISTS categorie TEXT DEFAULT 'entree',
ADD COLUMN IF NOT EXISTS evenement_type TEXT,
ADD COLUMN IF NOT EXISTS cree_par UUID REFERENCES users(id);

-- ÉTAPE 2 : Corriger les mouvements existants sans categorie
UPDATE mouvements
SET categorie = CASE
  WHEN type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet') THEN 'entree'
  WHEN type IN ('depense', 'distribution', 'pret') THEN 'sortie'
  ELSE 'entree'
END
WHERE categorie IS NULL OR categorie NOT IN ('entree', 'sortie');

-- ÉTAPE 3 : Vérification
SELECT '✅ Colonnes ajoutées et corrigées' as status;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mouvements'
ORDER BY ordinal_position;

SELECT '=== STATISTIQUES ===' as section;
SELECT
  COUNT(*) as total_mouvements,
  COUNT(CASE WHEN categorie = 'entree' THEN 1 END) as entrees,
  COUNT(CASE WHEN categorie = 'sortie' THEN 1 END) as sorties,
  COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) as en_attente,
  COUNT(CASE WHEN statut = 'valide' THEN 1 END) as valides,
  COUNT(CASE WHEN statut = 'rejete' THEN 1 END) as rejetes
FROM mouvements;

SELECT '🎉 Mise à jour terminée !' as final_status;
```

---

## 🚀 Étape 3 : Exécuter le script SQL

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez le contenu de `supabase/update-mouvements.sql`
4. Collez et exécutez

---

## 🧪 Étape 4 : Tester

```bash
npm run dev
```

1. Connectez-vous avec `+221 77 111 11 11` / `Password123!`
2. Vous devriez voir directement la page **Mouvements**
3. Testez la création d'un mouvement
4. Testez la création d'un événement

---

## 📞 Support

Si vous avez des problèmes :

1. Vérifiez que tous les fichiers ont été copiés correctement
2. Vérifiez que le script SQL a été exécuté
3. Videz le cache du navigateur (Ctrl+F5)
4. Consultez la console (F12) pour les erreurs

---

**Besoin d'aide pour copier les fichiers longs ?** Dites-moi lesquels et je vous les fournirai en plusieurs parties !
