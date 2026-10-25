# 🚀 Installation Backend Supabase - TontinePro

## 📋 Étapes à suivre

### 1️⃣ Exécuter le schéma SQL dans Supabase

1. Connectez-vous à votre projet Supabase : https://mdizmerhmetwlpmzgndx.supabase.co
2. Allez dans **SQL Editor** (icône dans le menu latéral)
3. Cliquez sur **"New query"**
4. Copiez-collez le contenu du fichier `supabase/schema.sql`
5. Cliquez sur **"Run"** (ou Ctrl+Enter)

⚠️ **Important** : Le script va créer :
- ✅ Toutes les tables (users, caisses, mouvements, prets, etc.)
- ✅ Les index pour les performances
- ✅ Les politiques RLS (Row Level Security)
- ✅ Les fonctions (calcul capital-temps, répartition intérêts)
- ✅ Les données de démonstration (membres, caisses, paramètres)

### 2️⃣ Vérifier l'installation

Après exécution, vérifiez dans **Table Editor** que les tables ont été créées :
- users
- caisses
- mouvements
- prets
- remboursements
- reunions
- tontines
- rangs_tontine
- distributions
- exercices
- parametres
- audit_log
- capital_temps

### 3️⃣ Tester les données de démo

Vous devriez voir :
- 8 membres (dont 7 actifs)
- 3 caisses (Principale, Épargne, Solidarité)
- 1 exercice ouvert (2025)
- 1 jeu de paramètres par défaut

### 4️⃣ Connexion à l'application

L'application frontend utilise maintenant Supabase. Pour vous connecter :
- Téléphone : `+221 77 123 45 67` (Admin)
- Mot de passe : vide (mode démo)

---

## 🔐 Matrice de permissions (implémentée via RLS)

| Fonctionnalité | Présidente | Trésorière | Secrétaire | Membre |
|----------------|-----------|-----------|-----------|--------|
| Voir soldes globaux | ✅ | ✅ | ✅ | ❌ |
| Encaisser cotisation | ❌ | ✅ | ❌ | ❌ |
| Valider/Refuser prêt | ✅ | ❌ | ❌ | ❌ |
| Demander prêt | ✅ | ✅ | ✅ | ✅ |
| Saisir présences/PV | ❌ | ❌ | ✅ | ❌ |
| Attribuer tour tontine | Validation | Encaissement | Saisie | Consultation |
| Télécharger reçu | ✅ | ✅ | ✅ | ✅ |

---

## 📊 Formule Capital-Temps (implémentée)

```
CTi = Ci × Ti

Ii = Itotal × (CTi / Σ(CTj))
```

Où :
- CTi = Capital-temps du membre i
- Ci = Montant déposé
- Ti = Durée de présence (en jours)
- Ii = Intérêts attribués au membre i
- Itotal = Intérêts nets à distribuer

---

## 🛠️ Prochaines étapes

1. ✅ Schéma SQL créé
2. ✅ Services TypeScript créés
3. ⏳ Adapter le frontend pour utiliser Supabase
4. ⏳ Tester les permissions RLS
5. ⏳ Implémenter le calcul capital-temps dans l'UI

---

## 📝 Notes techniques

- **ORM** : Drizzle (schéma dans `src/lib/schema.ts`)
- **Client** : @supabase/supabase-js
- **Fonctions SQL** : Capital-temps, répartition intérêts, validation mouvements
- **Sécurité** : RLS activé sur toutes les tables
- **Audit** : Log automatique des actions importantes
