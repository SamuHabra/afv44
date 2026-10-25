# 🔄 Guide de Réinitialisation Complète

## 📋 Vue d'ensemble

Ce guide vous permet de **repartir de zéro** avec :
- ✅ Toutes les tables vidées
- ✅ 5 utilisateurs créés (un par rôle)
- ✅ 3 caisses créées
- ✅ Paramètres par défaut
- ✅ Exercice annuel ouvert

---

## 🎯 Les 5 comptes utilisateurs

| Rôle | Email | Téléphone | Nom complet |
|------|-------|-----------|-------------|
| **Admin** | admin@tontine.pro | +221 77 111 11 11 | Aminata Diallo |
| **Presidente** | presidente@tontine.pro | +221 77 222 22 22 | Fatou Ndiaye |
| **Tresoriere** | tresoriere@tontine.pro | +221 77 333 33 33 | Mariama Sow |
| **Secretaire** | secretaire@tontine.pro | +221 77 444 44 44 | Aissatou Ba |
| **Membre** | membre@tontine.pro | +221 77 555 55 55 | Khadija Diop |

**Mot de passe temporaire** : `Password123!` (à changer à la première connexion)

---

## 🚀 Processus en 3 étapes

### **Étape 1 : Réinitialiser la base de données**

1. Ouvrez **Supabase SQL Editor**
2. Copiez le contenu de `supabase/reset-and-init.sql`
3. Collez et exécutez
4. Vérifiez que vous voyez :
   ```
   ✅ Toutes les tables vidées
   ✅ 5 utilisateurs créés
   ✅ 3 caisses créées
   ✅ Paramètres créés
   ✅ Exercice créé
   ✅ RLS réactivé
   ```

### **Étape 2 : Créer les 5 comptes Auth**

Pour **CHAQUE** utilisateur ci-dessus :

1. Allez dans **Supabase Dashboard** → **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : (voir le tableau ci-dessus)
   - **Password** : `Password123!`
   - **Auto Confirm User** : ✅ **ON**
4. Cliquez sur **"Create user"**
5. Répétez pour les 5 utilisateurs

**Liste des emails à créer :**
- admin@tontine.pro
- presidente@tontine.pro
- tresoriere@tontine.pro
- secretaire@tontine.pro
- membre@tontine.pro

### **Étape 3 : Lier automatiquement les utilisateurs**

1. Retournez dans **SQL Editor**
2. Copiez le contenu de `supabase/link-all-users.sql`
3. Collez et exécutez
4. Vérifiez que tous les utilisateurs ont `auth_status = '✅ Lié'`

---

## ✅ Vérification finale

Exécutez cette requête pour vérifier :

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
FROM users u
ORDER BY 
  CASE u.role
    WHEN 'admin' THEN 1
    WHEN 'presidente' THEN 2
    WHEN 'tresoriere' THEN 3
    WHEN 'secretaire' THEN 4
    WHEN 'membre' THEN 5
  END;
```

**Résultat attendu :**
```
email                      | role       | actif | auth_id | auth_status
---------------------------|------------|-------|---------|------------
admin@tontine.pro          | admin      | true  | uuid-1  | ✅ Lié
presidente@tontine.pro     | presidente | true  | uuid-2  | ✅ Lié
tresoriere@tontine.pro     | tresoriere | true  | uuid-3  | ✅ Lié
secretaire@tontine.pro     | secretaire | true  | uuid-4  | ✅ Lié
membre@tontine.pro         | membre     | true  | uuid-5  | ✅ Lié
```

---

## 🧪 Test de connexion

1. Redémarrez l'application :
   ```bash
   npm run dev
   ```

2. Ouvrez http://localhost:5173

3. Connectez-vous avec :
   - **Email** : `admin@tontine.pro`
   - **Mot de passe** : `Password123!`

4. ✅ Vous devriez être connecté et voir le dashboard

5. Testez les autres comptes :
   - presidente@tontine.pro / Password123!
   - tresoriere@tontine.pro / Password123!
   - secretaire@tontine.pro / Password123!
   - membre@tontine.pro / Password123!

---

## 🔧 Dépannage

### **Problème : "permission denied"**

Si vous voyez encore "permission denied", exécutez :
```sql
-- Ouvrez supabase/final-fix-rls.sql et exécutez-le
```

### **Problème : "Utilisateur non trouvé"**

Vérifiez que `auth_id` est bien lié :
```sql
SELECT email, auth_id FROM users WHERE email = 'admin@tontine.pro';
```

Si `auth_id` est NULL, ré-exécutez `supabase/link-all-users.sql`

### **Problème : Compte Auth non créé**

Vérifiez dans **Authentication** → **Users** que les 5 comptes existent :
- admin@tontine.pro
- presidente@tontine.pro
- tresoriere@tontine.pro
- secretaire@tontine.pro
- membre@tontine.pro

---

## 📊 Données créées

### **Utilisateurs (5)**
- 1 Admin
- 1 Presidente
- 1 Tresoriere
- 1 Secretaire
- 1 Membre

### **Caisses (3)**
- Caisse Principale (solde: 0)
- Caisse Épargne (solde: 0)
- Caisse Solidarité (solde: 0)

### **Paramètres**
- Cotisation mensuelle : 25 000 FCFA
- Pénalité retard : 5 000 FCFA
- Taux intérêt prêt : 5%
- Durée max prêt : 6 mois
- Montant max prêt : 500 000 FCFA
- Devise : FCFA
- Fréquence réunion : Mensuel
- Jour réunion : Dimanche

### **Exercice**
- Année : Année en cours
- Statut : Ouvert

---

## 🎯 Prochaines étapes

Une fois la connexion fonctionnelle :

1. ✅ Tester la création de nouveaux membres (admin)
2. ✅ Tester la gestion des caisses
3. ✅ Tester les mouvements financiers
4. ✅ Tester les prêts
5. ✅ Tester les réunions
6. ✅ Tester les tontines
7. ✅ Tester les distributions
8. ✅ Tester les rapports

---

## 💡 Conseils

- 🔐 **Sécurité** : Changez les mots de passe après la première connexion
- 📧 **Email** : Vérifiez que les emails sont corrects avant de créer les comptes Auth
- 🔄 **Sauvegarde** : Faites une sauvegarde avant de réinitialiser si vous avez des données importantes
- 🧪 **Tests** : Testez chaque rôle pour vérifier les permissions

---

## 📝 Récapitulatif des scripts

| Script | Objectif | Quand l'exécuter |
|--------|----------|------------------|
| `reset-and-init.sql` | Vider et créer les 5 utilisateurs | **Étape 1** |
| (Manuel) | Créer les 5 comptes Auth | **Étape 2** |
| `link-all-users.sql` | Lier automatiquement les auth_id | **Étape 3** |
| `final-fix-rls.sql` | Corriger les politiques RLS | Si problème "permission denied" |

---

**Prêt à réinitialiser ? Commencez par l'Étape 1 !** 🚀
