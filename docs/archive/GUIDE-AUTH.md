# 🔐 Guide de Configuration - Authentification & Membres

## 📋 **Vue d'ensemble**

Ce guide vous accompagne pour configurer l'authentification Supabase Auth et la gestion des membres dans TontinePro.

---

## 🚀 **Étape 1 : Exécuter les migrations SQL**

### **1.1 Migration d'authentification**

1. Allez dans **Supabase Dashboard** → **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez le contenu de `supabase/migration-auth.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur **"Run"** (ou Ctrl+Enter)

✅ **Résultat attendu** : Les colonnes `auth_id`, `first_login`, `password_changed` sont ajoutées à la table `users`

### **1.2 Insertion des utilisateurs initiaux**

1. Toujours dans **SQL Editor**, créez une nouvelle requête
2. Copiez le contenu de `supabase/insert-users.sql`
3. Collez-le et exécutez

✅ **Résultat attendu** : 8 utilisateurs sont créés dans la table `users`

---

## 🔑 **Étape 2 : Activer Supabase Auth**

### **2.1 Configurer le provider Email**

1. Allez dans **Supabase Dashboard** → **Authentication** → **Providers**
2. Cliquez sur **Email**
3. Activez le provider :
   - ✅ Enable Email provider : **ON**
   - ✅ Confirm email : **ON**
4. Cliquez sur **"Save"**

### **2.2 Personnaliser les templates d'email (optionnel)**

1. Allez dans **Authentication** → **Email Templates**
2. Modifiez les templates :
   - **Confirm signup** : Email de confirmation d'inscription
   - **Reset password** : Email de réinitialisation de mot de passe
   - **Magic link** : Email de connexion magique

**Exemple de template personnalisé :**

```html
<h2>Bienvenue sur TontinePro !</h2>
<p>Bonjour {{ .User.UserMetadata.nom }},</p>
<p>Votre compte a été créé avec succès.</p>
<p><strong>Email :</strong> {{ .User.Email }}</p>
<p><strong>Mot de passe temporaire :</strong> {{ .User.UserMetadata.tempPassword }}</p>
<p><a href="{{ .ConfirmationUrl }}">Confirmer votre compte</a></p>
<p>À la première connexion, vous pourrez changer votre mot de passe.</p>
```

---

## 👥 **Étape 3 : Créer les comptes Supabase Auth**

### **Méthode 1 : Via le Dashboard (recommandé pour les utilisateurs initiaux)**

Pour chaque utilisateur de `insert-users.sql` :

1. Allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : `aminata@tontine.pro`
   - **Password** : Générez un mot de passe temporaire (ex: `Temp123!`)
   - **Auto Confirm User** : ✅ **ON**
4. Cliquez sur **"Create user"**
5. **Copiez l'UUID** de l'utilisateur créé
6. Retournez dans **SQL Editor** et exécutez :

```sql
UPDATE users SET auth_id = 'UUID_COPIE_ICI' WHERE email = 'aminata@tontine.pro';
```

7. Répétez pour tous les utilisateurs

### **Méthode 2 : Via l'application (pour les nouveaux membres)**

Une fois configuré, l'admin peut créer des membres directement depuis l'application :

1. Connectez-vous en tant qu'admin
2. Allez dans **Membres** → **"Nouveau membre"**
3. Remplissez le formulaire
4. Cliquez sur **"Créer le membre"**
5. Le système crée automatiquement le compte Supabase Auth
6. Les identifiants sont affichés à l'admin

---

## 🧪 **Étape 4 : Tester l'authentification**

### **4.1 Tester la connexion**

1. Lancez l'application : `npm run dev`
2. Ouvrez http://localhost:5173
3. Essayez de vous connecter avec :
   - **Email** : `aminata@tontine.pro`
   - **Mot de passe** : Le mot de passe temporaire que vous avez défini

✅ **Résultat attendu** : Connexion réussie, proposition de changer le mot de passe

### **4.2 Tester la récupération de mot de passe**

1. Cliquez sur **"Mot de passe oublié ?"**
2. Entrez l'email : `aminata@tontine.pro`
3. Cliquez sur **"Envoyer le lien"**
4. Vérifiez votre email (ou le dossier spam)
5. Cliquez sur le lien reçu
6. Définissez un nouveau mot de passe

✅ **Résultat attendu** : Mot de passe réinitialisé avec succès

### **4.3 Tester la création de membre**

1. Connectez-vous en tant qu'admin
2. Allez dans **Membres** → **"Nouveau membre"**
3. Remplissez le formulaire avec un nouvel email
4. Cliquez sur **"Créer le membre"**
5. Vérifiez que les identifiants sont affichés

✅ **Résultat attendu** : Membre créé, identifiants affichés

---

## 🔒 **Étape 5 : Sécurité & Bonnes pratiques**

### **5.1 Rate limiting**

Supabase applique automatiquement un rate limiting :
- **Login** : 10 tentatives / minute / IP
- **Inscription** : 5 tentatives / heure / IP
- **Récupération** : 5 tentatives / heure / email

✅ **Aucune configuration nécessaire**

### **5.2 Validation des mots de passe**

Exigences minimales :
- ✅ Minimum 8 caractères
- ✅ Lettres et chiffres
- ✅ Pas de mots de passe courants

### **5.3 Politiques RLS**

Les politiques RLS sont déjà configurées dans `migration-auth.sql` :
- ✅ Seul l'admin peut créer des utilisateurs
- ✅ L'utilisateur peut modifier son propre mot de passe
- ✅ Les données sensibles sont protégées

---

## 📊 **Étape 6 : Vérification & Monitoring**

### **6.1 Vérifier les utilisateurs**

Dans **SQL Editor** :

```sql
-- Voir tous les utilisateurs
SELECT 
  u.id,
  u.nom,
  u.prenom,
  u.email,
  u.role,
  u.actif,
  u.first_login,
  u.password_changed,
  CASE WHEN u.auth_id IS NOT NULL THEN '✅' ELSE '❌' END as auth_configured
FROM users u
ORDER BY u.date_inscription DESC;
```

### **6.2 Vérifier les sessions actives**

Dans **Authentication** → **Users**, vous pouvez voir :
- Les utilisateurs connectés
- La dernière connexion
- Le provider utilisé

---

## 🛠️ **Dépannage**

### **Problème : "Invalid login credentials"**

**Cause** : Le compte Supabase Auth n'existe pas ou le mot de passe est incorrect

**Solution** :
1. Vérifiez que l'utilisateur existe dans **Authentication** → **Users**
2. Réinitialisez le mot de passe via **"Reset password"**
3. Vérifiez que `auth_id` est bien renseigné dans la table `users`

### **Problème : "Email not confirmed"**

**Cause** : L'email n'a pas été confirmé

**Solution** :
1. Allez dans **Authentication** → **Users**
2. Trouvez l'utilisateur
3. Cliquez sur **"..."** → **"Confirm email"**

### **Problème : "User not found"**

**Cause** : L'utilisateur existe dans `public.users` mais pas dans `auth.users`

**Solution** :
1. Créez l'utilisateur dans **Authentication** → **Users**
2. Copiez l'UUID
3. Mettez à jour `auth_id` dans `public.users`

---

## 📝 **Récapitulatif des fichiers**

| Fichier | Description |
|---------|-------------|
| `supabase/migration-auth.sql` | Migration pour ajouter les colonnes d'authentification |
| `supabase/insert-users.sql` | Insertion des utilisateurs initiaux |
| `src/lib/auth.ts` | Service d'authentification |
| `src/pages/Login.tsx` | Page de connexion |
| `src/pages/ForgotPassword.tsx` | Récupération de mot de passe |
| `src/pages/ResetPassword.tsx` | Réinitialisation de mot de passe |
| `src/pages/Members.tsx` | Gestion des membres (admin) |

---

## 🎯 **Prochaines étapes**

Une fois l'authentification configurée :

1. ✅ **Phase 2** : Gestion des caisses
2. ✅ **Phase 3** : Gestion des mouvements
3. ✅ **Phase 4** : Gestion des prêts
4. ✅ **Phase 5** : Gestion des réunions
5. ✅ **Phase 6** : Gestion des tontines
6. ✅ **Phase 7** : Distributions
7. ✅ **Phase 8** : Rapports
8. ✅ **Phase 9** : Paramètres

---

## 💡 **Conseils**

- 🔐 **Sécurité** : Ne partagez jamais les mots de passe temporaires en clair
- 📧 **Email** : Utilisez un service d'email professionnel pour les notifications
- 🔄 **Synchronisation** : Vérifiez régulièrement que `auth_id` est bien renseigné
- 📊 **Monitoring** : Surveillez les tentatives de connexion suspectes
- 🎓 **Formation** : Formez les admins aux bonnes pratiques de sécurité

---

**Besoin d'aide ?** Consultez la documentation Supabase : https://supabase.com/docs/guides/auth
