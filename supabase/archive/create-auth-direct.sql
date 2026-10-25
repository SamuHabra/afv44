-- ============================================
-- 🚀 CRÉATION DIRECTE DES COMPTES AUTH
-- ============================================
-- Ce script crée les comptes Auth DIRECTEMENT
-- dans auth.users SANS envoyer d'email
-- (contourne le rate limiting)
-- ============================================

-- IMPORTANT : Avant d'exécuter ce script :
-- 1. Allez dans Supabase Dashboard → Authentication → Providers → Email
-- 2. Désactivez "Confirm email"
-- 3. Sauvegardez

-- ============================================
-- CRÉATION DES 5 COMPTES AUTH
-- ============================================
-- Mot de passe pour tous : Password123!
-- (crypté avec bcrypt automatiquement)
-- ============================================

-- 1. ADMIN
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tontine.pro',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nom": "Diallo", "prenom": "Aminata", "role": "admin"}',
  NOW(),
  NOW(),
  '',
  '',
  false
);

-- 2. PRESIDENTE
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'presidente@tontine.pro',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nom": "Ndiaye", "prenom": "Fatou", "role": "presidente"}',
  NOW(), NOW(), '', '', false
);

-- 3. TRESORIERE
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tresoriere@tontine.pro',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nom": "Sow", "prenom": "Mariama", "role": "tresoriere"}',
  NOW(), NOW(), '', '', false
);

-- 4. SECRETAIRE
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'secretaire@tontine.pro',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nom": "Ba", "prenom": "Aissatou", "role": "secretaire"}',
  NOW(), NOW(), '', '', false
);

-- 5. MEMBRE
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'membre@tontine.pro',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"nom": "Diop", "prenom": "Khadija", "role": "membre"}',
  NOW(), NOW(), '', '', false
);

SELECT '✅ 5 comptes Auth créés directement (sans email)' as status;

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT '=== COMPTES AUTH CRÉÉS ===' as section;
SELECT 
  email,
  role,
  email_confirmed_at,
  created_at,
  '✅ Créé' as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- LIAISON AUTOMATIQUE
-- ============================================

SELECT '🔗 Liaison des auth_id...' as progress;

UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

SELECT '✅ Liaison terminée' as status;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

SELECT '=== VÉRIFICATION FINALE ===' as section;
SELECT 
  u.email,
  u.role,
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

-- ============================================
-- TEST DE CONNEXION
-- ============================================

SELECT '🧪 Testez maintenant la connexion :' as test;
SELECT 'Email: admin@tontine.pro' as email;
SELECT 'Mot de passe: Password123!' as password;
SELECT '✅ La connexion devrait fonctionner !' as message;
