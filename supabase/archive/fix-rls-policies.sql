-- ============================================
-- CORRECTION DES POLITIQUES RLS
-- ============================================
-- Permet la lecture de la table users pour l'authentification
-- tout en gardant la sécurité pour les autres opérations
-- ============================================

-- ÉTAPE 1 : Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_select_bureau" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_own_password" ON users;

-- ÉTAPE 2 : Créer des politiques plus permissives

-- Politique SELECT : Tout le monde peut lire les utilisateurs (nécessaire pour l'authentification)
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique SELECT pour anon (permet la connexion)
CREATE POLICY "users_select_anon" ON users
  FOR SELECT
  TO anon
  USING (actif = true);

-- Politique INSERT : Seul l'admin peut créer des utilisateurs
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Politique UPDATE : L'utilisateur peut modifier ses propres données
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()) OR auth_id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()) OR auth_id = (SELECT auth.uid()));

-- Politique DELETE : Seul l'admin peut supprimer
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ÉTAPE 3 : Vérification
SELECT '✅ Politiques RLS corrigées' as status;

-- Voir les politiques actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================
-- TEST DE CONNEXION
-- ============================================
-- Après avoir exécuté ce script, testez la connexion :
-- 1. Redémarrez l'application : npm run dev
-- 2. Connectez-vous avec aminata@tontine.pro
-- 3. La connexion devrait fonctionner maintenant
-- ============================================
