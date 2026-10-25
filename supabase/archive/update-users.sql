-- ============================================
-- MISE À JOUR DES UTILISATEURS EXISTANTS
-- ============================================
-- Ajoute les emails et colonnes d'authentification
-- aux utilisateurs déjà créés par schema.sql
-- ============================================

-- Méthode 1 : Mettre à jour les utilisateurs existants
UPDATE users SET 
  email = 'aminata@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 123 45 67';

UPDATE users SET 
  email = 'fatou@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 234 56 78';

UPDATE users SET 
  email = 'mariama@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 345 67 89';

UPDATE users SET 
  email = 'aissatou@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 456 78 90';

UPDATE users SET 
  email = 'khadija@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 567 89 01';

UPDATE users SET 
  email = 'rama@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 678 90 12';

UPDATE users SET 
  email = 'ndeye@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 789 01 23';

UPDATE users SET 
  email = 'coumba@tontine.pro',
  first_login = true,
  password_changed = false
WHERE telephone = '+221 77 890 12 34';

-- Vérification
SELECT '✅ Utilisateurs mis à jour' as status;
SELECT id, nom, prenom, email, telephone, role, actif, first_login 
FROM users 
ORDER BY date_inscription;

-- ============================================
-- ÉTAPE SUIVANTE : Créer les comptes Supabase Auth
-- ============================================
-- Pour chaque utilisateur ci-dessus :
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Entrez l'email et un mot de passe temporaire
-- 4. Activez "Auto Confirm User"
-- 5. Copiez l'UUID de l'utilisateur créé
-- 6. Exécutez : UPDATE users SET auth_id = 'UUID' WHERE email = 'email';
-- ============================================
