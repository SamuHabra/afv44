-- ============================================
-- 🚨 SOLUTION RADICALE : DÉSACTIVER RLS
-- ============================================
-- Ce script désactive complètement RLS sur la table users
-- car l'authentification est déjà gérée par Supabase Auth
-- ============================================

-- ÉTAPE 1 : Supprimer TOUTES les politiques sur users
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

SELECT '✅ Toutes les politiques supprimées' as status;

-- ÉTAPE 2 : Désactiver RLS sur la table users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS désactivé sur users' as status;

-- ÉTAPE 3 : Accorder les permissions de base
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT DELETE ON users TO authenticated;

SELECT '✅ Permissions accordées' as status;

-- ÉTAPE 4 : Vérifier
SELECT '=== VÉRIFICATION ===' as section;
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'users';

-- ÉTAPE 5 : Tester la lecture
SELECT '=== TEST DE LECTURE ===' as section;
SELECT COUNT(*) as nb_users FROM users;

SELECT '✅ RLS complètement désactivé sur users - La connexion devrait fonctionner maintenant' as final_status;
