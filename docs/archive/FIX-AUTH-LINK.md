# 🔧 Résolution du problème "Utilisateur non trouvé"

## 📋 Diagnostic

Vous avez créé les utilisateurs dans Supabase Auth (Authentication → Users), mais la connexion affiche :
- ❌ **"Utilisateur non trouvé dans la base de données"** avec le bon mot de passe
- ✅ **"Email ou mot de passe incorrect"** avec un mauvais mot de passe

Cela signifie que :
- ✅ L'authentification Supabase Auth fonctionne
- ❌ Le lien entre `auth.users` et `public.users` n'est pas configuré

---

## 🎯 Solution en 3 étapes

### **Étape 1 : Vérifier l'état actuel**

Exécutez ce script dans **Supabase SQL Editor** :

```sql
SELECT 
  u.email,
  u.role,
  u.actif,
  u.auth_id,
  CASE 
    WHEN u.auth_id IS NULL THEN '❌ Non lié'
    ELSE '✅ Lié'
  END as auth_status
FROM public.users u
ORDER BY u.date_inscription;
```

**Résultat attendu** : Vous verrez probablement que `auth_id` est `NULL` pour tous les utilisateurs.

---

### **Étape 2 : Lier automatiquement les utilisateurs**

Exécutez ce script dans **Supabase SQL Editor** :

```sql
-- Liaison automatique par email
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;
```

Ce script lie automatiquement les utilisateurs de `auth.users` avec `public.users` en utilisant l'email comme clé.

---

### **Étape 3 : Vérifier la liaison**

Exécutez à nouveau le script de vérification :

```sql
SELECT 
  u.email,
  u.role,
  u.actif,
  u.auth_id,
  CASE 
    WHEN u.auth_id IS NULL THEN '❌ Non lié'
    ELSE '✅ Lié'
  END as auth_status
FROM public.users u
ORDER BY u.date_inscription;
```

**Résultat attendu** : Tous les utilisateurs doivent avoir `auth_status = '✅ Lié'`

---

## 🧪 Tester la connexion

1. Redémarrez l'application : `npm run dev`
2. Ouvrez http://localhost:5173
3. Connectez-vous avec :
   - **Email** : `aminata@tontine.pro`
   - **Mot de passe** : Le mot de passe que vous avez défini dans Supabase Auth

✅ **Connexion réussie !**

---

## 🔍 Si ça ne fonctionne toujours pas

### **Problème : Certains utilisateurs ne sont pas liés**

Vérifiez que les emails correspondent exactement :

```sql
-- Voir les utilisateurs dans auth.users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at;

-- Voir les utilisateurs dans public.users
SELECT id, email, auth_id
FROM public.users
ORDER BY date_inscription;
```

Si les emails ne correspondent pas (espaces, majuscules/minuscules), corrigez-les :

```sql
-- Exemple : corriger un email
UPDATE public.users
SET email = 'aminata@tontine.pro'
WHERE telephone = '+221 77 123 45 67';
```

Puis relancez le script de liaison automatique.

---

### **Problème : L'utilisateur n'existe pas dans auth.users**

Si un utilisateur existe dans `public.users` mais pas dans `auth.users` :

1. Allez dans **Supabase Dashboard** → **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Entrez l'email et un mot de passe
4. Activez **"Auto Confirm User"**
5. Cliquez sur **"Create user"**
6. Relancez le script de liaison automatique

---

## 📊 Script complet de diagnostic

Copiez-collez ce script pour voir l'état complet :

```sql
-- État des utilisateurs
SELECT 
  'public.users' as table_name,
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as linked_users,
  COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as unlinked_users
FROM public.users

UNION ALL

SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_users,
  NULL as linked_users,
  NULL as unlinked_users
FROM auth.users;

-- Détail par utilisateur
SELECT 
  pu.email,
  pu.role,
  pu.actif,
  CASE WHEN pu.auth_id IS NOT NULL THEN '✅' ELSE '❌' END as in_public,
  CASE WHEN au.id IS NOT NULL THEN '✅' ELSE '❌' END as in_auth
FROM public.users pu
LEFT JOIN auth.users au ON pu.email = au.email
ORDER BY pu.date_inscription;
```

---

## ✅ Checklist finale

- [ ] Les utilisateurs existent dans `auth.users` (Authentication → Users)
- [ ] Les utilisateurs existent dans `public.users` (Table Editor)
- [ ] Les emails correspondent exactement entre les deux tables
- [ ] Le script de liaison automatique a été exécuté
- [ ] Tous les utilisateurs ont `auth_id` renseigné
- [ ] La connexion fonctionne avec l'application

---

## 💡 Explication technique

### **Pourquoi ce problème ?**

Supabase a deux tables d'utilisateurs :

1. **`auth.users`** : Gérée par Supabase Auth
   - Contient les identifiants de connexion (email, mot de passe)
   - Générée automatiquement quand vous créez un utilisateur dans Authentication

2. **`public.users`** : Votre table personnalisée
   - Contient les informations métier (nom, rôle, téléphone, etc.)
   - Créée par vous avec le schéma SQL

### **Le lien : `auth_id`**

La colonne `auth_id` dans `public.users` fait le lien entre les deux tables :

```
public.users.auth_id → auth.users.id
```

Quand un utilisateur se connecte :
1. Supabase Auth vérifie l'email/mot de passe dans `auth.users`
2. L'application récupère l'`id` de l'utilisateur authentifié
3. L'application cherche dans `public.users` où `auth_id = id`
4. Si trouvé → connexion réussie
5. Si non trouvé → "Utilisateur non trouvé"

---

## 🚀 Prochaines étapes

Une fois la connexion fonctionnelle :

1. ✅ Tester la création de nouveaux membres (admin)
2. ✅ Tester la récupération de mot de passe
3. ✅ Tester le changement de mot de passe
4. ✅ Passer à la Phase 3 : Gestion des Caisses

---

**Exécutez les scripts et dites-moi si la connexion fonctionne !** 🎯
