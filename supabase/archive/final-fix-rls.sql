-- ============================================
-- SOLUTION FINALE : POLITIQUES RLS ULTRA-PERMISSIVES POUR SELECT
-- ============================================
-- Ce script désactive RLS pour SELECT sur la table users
-- car l'authentification est déjà gérée par Supabase Auth
-- ============================================

-- ÉTAPE 1 : Supprimer TOUTES les politiques existantes sur users
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_select_bureau" ON users;
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_select_anon" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_own_password" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- ÉTAPE 2 : Créer UNE SEULE politique ultra-permissive pour SELECT
-- Cette politique permet à TOUS LE MONDE de lire la table users
-- (nécessaire pour l'authentification et l'affichage des membres)
CREATE POLICY "users_select_all_permissive" ON users
  FOR SELECT
  USING (true);

-- ÉTAPE 3 : Politique INSERT pour l'admin uniquement
CREATE POLICY "users_insert_admin_only" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ÉTAPE 4 : Politique UPDATE pour l'utilisateur lui-même ou l'admin
CREATE POLICY "users_update_self_or_admin" ON users
  FOR UPDATE
  USING (
    auth_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ÉTAPE 5 : Politique DELETE pour l'admin uniquement
CREATE POLICY "users_delete_admin_only" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ÉTAPE 6 : Vérification
SELECT '✅ Politiques RLS simplifiées et appliquées' as status;

-- Voir les politiques actuelles
SELECT 
  policyname,
  cmd,
  roles::text,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ÉTAPE 7 : Tester la lecture
SELECT 'Test de lecture:' as test, COUNT(*) as nb_users FROM users;

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Exécutez ce script dans Supabase SQL Editor
-- 2. Vérifiez que vous voyez 4 politiques :
--    - users_select_all_permissive (SELECT)
--    - users_insert_admin_only (INSERT)
--    - users_update_self_or_admin (UPDATE)
--    - users_delete_admin_only (DELETE)
-- 3. Redémarrez l'application : npm run dev
-- 4. Testez la connexion avec aminata@tontine.pro
-- ============================================
