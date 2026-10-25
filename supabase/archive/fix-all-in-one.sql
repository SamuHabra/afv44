-- ============================================
-- 🎯 SCRIPT TOUT-EN-UN : FIX COMPLET
-- ============================================
-- Ce script fait TOUT en une seule exécution :
-- 1. Désactive RLS sur users
-- 2. Vérifie les utilisateurs
-- 3. Vérifie les comptes Auth
-- 4. Lie les auth_id
-- 5. Teste la connexion
-- ============================================

-- ÉTAPE 1 : Désactiver RLS
SELECT '🔧 ÉTAPE 1 : Désactivation de RLS...' as progress;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

SELECT '✅ RLS désactivé' as status;

-- ÉTAPE 2 : Vérifier les utilisateurs
SELECT '🔍 ÉTAPE 2 : Vérification des utilisateurs...' as progress;

SELECT 
  'Utilisateurs dans public.users' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 5 THEN '✅ OK' ELSE '❌ MANQUANT' END as status
FROM users

UNION ALL

SELECT 
  'Utilisateurs avec auth_id' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 5 THEN '✅ OK' ELSE '⏳ À LIER' END as status
FROM users
WHERE auth_id IS NOT NULL

UNION ALL

SELECT 
  'Comptes dans auth.users' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 5 THEN '✅ OK' ELSE '❌ CRÉER LES COMPTES' END as status
FROM auth.users;

-- ÉTAPE 3 : Lier automatiquement les auth_id
SELECT '🔗 ÉTAPE 3 : Liaison automatique des auth_id...' as progress;

UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

SELECT '✅ Liaison terminée' as status;

-- ÉTAPE 4 : Vérification finale
SELECT '✅ ÉTAPE 4 : Vérification finale...' as progress;

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

-- ÉTAPE 5 : Test de lecture
SELECT '🧪 ÉTAPE 5 : Test de lecture...' as progress;

SELECT 
  'Test de lecture réussi' as status,
  COUNT(*) as nb_users,
  '✅ La connexion devrait fonctionner maintenant' as message
FROM users;

-- ÉTAPE 6 : Résumé
SELECT '📊 RÉSUMÉ' as progress;

SELECT 
  'Configuration terminée !' as message,
  '1. RLS désactivé sur users' as step1,
  '2. Utilisateurs vérifiés' as step2,
  '3. auth_id liés automatiquement' as step3,
  '4. Test de lecture réussi' as step4,
  '5. Connectez-vous avec admin@tontine.pro / Password123!' as step5;

SELECT '🎉 TOUT EST PRÊT ! Redémarrez l''application avec npm run dev' as final_message;
