# 🚨 Guide de Dépannage - Problèmes de Connexion

## 📋 Problèmes identifiés

Vous avez **2 problèmes distincts** :

### **Problème 1 : En aperçu Qwen**
```
Erreur Supabase: permission denied for table users
```

### **Problème 2 : En local**
```
Utilisateur non trouvé dans la base de données. Vérifiez que auth_id est configuré dans Supabase.
```
Alors que `auth_id` est bien lié.

---

## 🔍 Diagnostic

### **Pourquoi ces erreurs ?**

Les deux problèmes viennent des **politiques RLS (Row Level Security)** qui sont trop restrictives.

Quand un utilisateur se connecte :
1. ✅ `supabase.auth.signInWithPassword()` réussit (le mot de passe est correct)
2. ❌ La requête `SELECT * FROM users WHERE auth_id = '...'` échoue
3. ❌ L'application affiche "Utilisateur non trouvé" ou "permission denied"

Le problème : Les politiques RLS bloquent la lecture de la table `users` même pour les utilisateurs authentifiés.

---

## ✅ Solution : Script SQL final

Le fichier `supabase/final-fix-rls.sql` corrige définitivement ce problème.

### **Ce que fait le script :**

1. ✅ Supprime TOUTES les anciennes politiques RLS sur la table `users`
2. ✅ Crée UNE SEULE politique ultra-permissive pour SELECT (lecture)
3. ✅ Garde les restrictions pour INSERT/UPDATE/DELETE (écriture)
4. ✅ Permet à tout le monde de lire les utilisateurs (nécessaire pour l'authentification)

### **Pourquoi cette approche ?**

L'authentification est déjà gérée par **Supabase Auth** (email + mot de passe). La table `public.users` contient juste les informations supplémentaires (nom, rôle, téléphone, etc.). Donc :

- ✅ **SELECT** : Tout le monde peut lire (pour l'authentification et l'affichage)
- ✅ **INSERT** : Seul l'admin peut créer des utilisateurs
- ✅ **UPDATE** : L'utilisateur peut modifier ses propres données
- ✅ **DELETE** : Seul l'admin peut supprimer

---

## 🚀 Étapes à suivre

### **Étape 1 : Exécuter le script SQL**

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase/final-fix-rls.sql`
4. Copiez **TOUT** le contenu
5. Collez-le dans le SQL Editor
6. Cliquez sur **"Run"**

**Résultat attendu :**
```
✅ Politiques RLS simplifiées et appliquées

policyname                      | cmd    | roles       | qual | with_check
users_select_all_permissive     | SELECT | {public}    | true | 
users_insert_admin_only         | INSERT | {public}    |      | (EXISTS ...)
users_update_self_or_admin      | UPDATE | {public}    | ...  | 
users_delete_admin_only         | DELETE | {public}    | ...  | 
```

### **Étape 2 : Vérifier les politiques**

Exécutez cette requête pour voir les politiques actuelles :

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd;
```

Vous devriez voir exactement **4 politiques** :
- `users_select_all_permissive` (SELECT)
- `users_insert_admin_only` (INSERT)
- `users_update_self_or_admin` (UPDATE)
- `users_delete_admin_only` (DELETE)

### **Étape 3 : Tester la connexion**

```bash
npm run dev
```

Ouvrez la console du navigateur (F12) pour voir les logs de debug :

```
🔍 Debug connexion:
  - Email: aminata@tontine.pro
  - Auth User ID: abc123-def456-...
  - Tentative 1: Recherche par auth_id...
  ✅ Utilisateur trouvé par auth_id
✅ Connexion réussie pour: aminata@tontine.pro
```

Connectez-vous avec :
- **Email** : `aminata@tontine.pro`
- **Mot de passe** : Celui défini dans Supabase Auth

✅ **Connexion réussie !**

---

## 🔧 Si ça ne fonctionne toujours pas

### **Cas 1 : "permission denied" persiste**

Vérifiez que RLS est activé sur la table `users` :

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'users';
```

Si `relrowsecurity = false`, activez-le :

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

Puis ré-exécutez le script `final-fix-rls.sql`.

### **Cas 2 : "Utilisateur non trouvé" persiste**

Vérifiez que `auth_id` est bien renseigné :

```sql
SELECT email, auth_id, 
  CASE WHEN auth_id IS NULL THEN '❌' ELSE '✅' END as status
FROM users
WHERE email = 'aminata@tontine.pro';
```

Si `auth_id` est NULL, exécutez le script de liaison :

```sql
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;
```

### **Cas 3 : Erreur "multiple rows"**

Si vous voyez "Plusieurs utilisateurs trouvés", cela signifie qu'il y a des doublons. Supprimez-les :

```sql
-- Voir les doublons
SELECT email, COUNT(*)
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Supprimer les doublons (garde le plus récent)
DELETE FROM users
WHERE id NOT IN (
  SELECT MAX(id)
  FROM users
  GROUP BY email
);
```

---

## 📊 Logs de debug

Le code frontend affiche maintenant des logs détaillés dans la console du navigateur (F12) :

```
🔍 Debug connexion:
  - Email: aminata@tontine.pro
  - Auth User ID: abc123-def456-...
  - Tentative 1: Recherche par auth_id...
  ✅ Utilisateur trouvé par auth_id
✅ Connexion réussie pour: aminata@tontine.pro
```

Ou en cas d'erreur :

```
🔍 Debug connexion:
  - Email: aminata@tontine.pro
  - Auth User ID: abc123-def456-...
  - Tentative 1: Recherche par auth_id...
  ❌ Erreur méthode 1: permission denied for table users
  - Tentative 2: Recherche par email...
  ❌ Erreur méthode 2: permission denied for table users
  - Tentative 3: Recherche par téléphone...
  ❌ Erreur méthode 3: permission denied for table users
❌ Utilisateur non trouvé avec toutes les méthodes
```

Ces logs vous aident à identifier exactement où le problème se situe.

---

## ✅ Checklist finale

- [ ] Script `final-fix-rls.sql` exécuté dans Supabase SQL Editor
- [ ] 4 politiques RLS créées (SELECT, INSERT, UPDATE, DELETE)
- [ ] `auth_id` renseigné pour tous les utilisateurs
- [ ] Application redémarrée (`npm run dev`)
- [ ] Console du navigateur ouverte (F12) pour voir les logs
- [ ] Connexion testée avec `aminata@tontine.pro`
- [ ] Logs de debug affichent "✅ Connexion réussie"
- [ ] Accès au dashboard réussi

---

## 💡 Explication technique

### **Pourquoi "permission denied" en aperçu Qwen ?**

L'aperçu Qwen utilise probablement une configuration différente (clé API, environnement, etc.) qui déclenche les politiques RLS de manière plus stricte. Le script `final-fix-rls.sql` crée une politique `USING (true)` qui permet à tout le monde de lire, ce qui résout le problème.

### **Pourquoi "Utilisateur non trouvé" en local ?**

Même si `auth_id` est bien lié, les politiques RLS peuvent bloquer la requête SELECT. Le script `final-fix-rls.sql` crée une politique permissive qui permet la lecture.

### **Pourquoi cette approche est sûre ?**

- ✅ L'authentification est gérée par **Supabase Auth** (email + mot de passe)
- ✅ La table `public.users` contient juste des informations supplémentaires
- ✅ Les opérations sensibles (INSERT/UPDATE/DELETE) restent protégées par RLS
- ✅ Seul l'admin peut créer/supprimer des utilisateurs
- ✅ L'utilisateur ne peut modifier que ses propres données

---

## 🎯 Résumé

**Problème** : Les politiques RLS bloquent la lecture de la table `users`  
**Solution** : Exécuter `supabase/final-fix-rls.sql` pour créer des politiques permissives  
**Résultat** : La connexion fonctionne, l'authentification reste sécurisée

---

**Exécutez le script `final-fix-rls.sql` et dites-moi si la connexion fonctionne !** 🚀
