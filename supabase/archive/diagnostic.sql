-- ============================================
-- DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES
-- ============================================
-- Exécutez ce script pour voir l'état complet
-- et identifier tous les problèmes
-- ============================================

-- 1. Vérifier l'état de RLS sur toutes les tables
SELECT '=== ÉTAT RLS ===' as section;
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname IN ('users', 'caisses', 'mouvements', 'prets', 'reunions', 'tontines')
ORDER BY relname;

-- 2. Voir les politiques RLS sur la table users
SELECT '=== POLITIQUES RLS SUR USERS ===' as section;
SELECT 
  policyname,
  cmd,
  roles::text,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- 3. Vérifier les utilisateurs dans public.users
SELECT '=== UTILISATEURS PUBLIC.USERS ===' as section;
SELECT 
  id,
  email,
  telephone,
  role,
  actif,
  auth_id,
  first_login,
  password_changed,
  CASE 
    WHEN auth_id IS NULL THEN '❌ Non lié'
    ELSE '✅ Lié'
  END as auth_status
FROM users
ORDER BY date_inscription;

-- 4. Vérifier les utilisateurs dans auth.users
SELECT '=== UTILISATEURS AUTH.USERS ===' as section;
SELECT 
  id,
  email,
  phone,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at;

-- 5. Vérifier la liaison entre les deux tables
SELECT '=== VÉRIFICATION DE LA LIAISON ===' as section;
SELECT 
  pu.email,
  pu.role,
  pu.auth_id,
  au.id as auth_user_id,
  au.last_sign_in_at,
  CASE 
    WHEN pu.auth_id IS NULL THEN '❌ auth_id manquant'
    WHEN au.id IS NULL THEN '❌ Compte Auth manquant'
    WHEN pu.auth_id = au.id THEN '✅ Correctement lié'
    ELSE '❌ ID mismatch'
  END as status
FROM public.users pu
LEFT JOIN auth.users au ON pu.email = au.email
ORDER BY pu.date_inscription;

-- 6. Statistiques
SELECT '=== STATISTIQUES ===' as section;
SELECT 
  'public.users' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as with_auth_id,
  COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as without_auth_id
FROM public.users

UNION ALL

SELECT 
  'auth.users' as table_name,
  COUNT(*) as total,
  NULL as with_auth_id,
  NULL as without_auth_id
FROM auth.users;

-- 7. Tester la lecture (avec les permissions actuelles)
SELECT '=== TEST DE LECTURE ===' as section;
SELECT 
  'Test de lecture réussi' as status,
  COUNT(*) as nb_users
FROM users;

-- 8. Recommandations
SELECT '=== RECOMMANDATIONS ===' as section;
SELECT 
  CASE 
    WHEN COUNT(CASE WHEN auth_id IS NULL THEN 1 END) > 0 
    THEN '⚠️ Certains utilisateurs n''ont pas auth_id. Exécutez link-auth-users.sql'
    ELSE '✅ Tous les utilisateurs ont auth_id'
  END as recommendation
FROM users

UNION ALL

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND cmd = 'SELECT')
    THEN '⚠️ Aucune politique SELECT sur users. Exécutez final-fix-rls.sql'
    ELSE '✅ Politiques SELECT présentes'
  END as recommendation
FROM pg_policies
LIMIT 1;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Exécutez ce script dans Supabase SQL Editor
-- 2. Analysez les résultats section par section
-- 3. Suivez les recommandations affichées
-- 4. Si tout est ✅, la connexion devrait fonctionner
-- ============================================
