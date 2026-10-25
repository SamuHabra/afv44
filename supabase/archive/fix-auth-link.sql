-- ============================================
-- DIAGNOSTIC ET CORRECTION DES UTILISATEURS
-- ============================================

-- ÉTAPE 1 : Voir l'état actuel des utilisateurs
SELECT 
  u.id,
  u.email,
  u.telephone,
  u.role,
  u.actif,
  u.auth_id,
  CASE 
    WHEN u.auth_id IS NULL THEN '❌ auth_id manquant'
    ELSE '✅ auth_id configuré'
  END as auth_status
FROM users u
ORDER BY u.date_inscription;

-- ÉTAPE 2 : Voir les utilisateurs dans auth.users
-- (Cette requête nécessite les permissions admin)
-- SELECT id, email, phone, created_at, last_sign_in_at
-- FROM auth.users
-- ORDER BY created_at;

-- ÉTAPE 3 : Corriger les auth_id manquants
-- Pour chaque utilisateur, vous devez :
-- 1. Aller dans Supabase Dashboard → Authentication → Users
-- 2. Trouver l'utilisateur par email
-- 3. Copier son UUID (colonne UID)
-- 4. Exécuter la requête ci-dessous

-- Exemple :
-- UPDATE users SET auth_id = 'VOTRE_UUID_ICI' WHERE email = 'aminata@tontine.pro';

-- ÉTAPE 4 : Script pour relier tous les auth_id
-- Remplacez les UUID par ceux copiés depuis Authentication → Users
/*
UPDATE users SET auth_id = 'UUID_AMINATA' WHERE email = 'aminata@tontine.pro';
UPDATE users SET auth_id = 'UUID_FATOU' WHERE email = 'fatou@tontine.pro';
UPDATE users SET auth_id = 'UUID_MARIAMA' WHERE email = 'mariama@tontine.pro';
UPDATE users SET auth_id = 'UUID_AISSATOU' WHERE email = 'aissatou@tontine.pro';
UPDATE users SET auth_id = 'UUID_KHADIJA' WHERE email = 'khadija@tontine.pro';
UPDATE users SET auth_id = 'UUID_RAMA' WHERE email = 'rama@tontine.pro';
UPDATE users SET auth_id = 'UUID_NDEYE' WHERE email = 'ndeye@tontine.pro';
UPDATE users SET auth_id = 'UUID_COUMBA' WHERE email = 'coumba@tontine.pro';
*/

-- ÉTAPE 5 : Vérification finale
SELECT 
  u.email,
  u.role,
  u.actif,
  u.auth_id,
  CASE 
    WHEN u.auth_id IS NULL THEN '❌ Manquant'
    ELSE '✅ Configuré'
  END as auth_status
FROM users u
ORDER BY u.date_inscription;
