-- ============================================
-- LIAISON AUTOMATIQUE auth_id
-- ============================================
-- Ce script lie automatiquement les utilisateurs
-- de auth.users avec public.users via l'email
-- ============================================

-- Méthode 1 : Liaison automatique par email
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- Vérification après liaison
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

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Exécutez ce script dans Supabase SQL Editor
-- 2. Vérifiez que tous les utilisateurs ont auth_status = '✅ Lié'
-- 3. Si certains utilisateurs ne sont pas liés, vérifiez que :
--    - L'email dans public.users correspond exactement à celui dans auth.users
--    - L'utilisateur existe dans Authentication → Users
-- 4. Testez la connexion avec l'application
-- ============================================
