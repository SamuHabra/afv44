-- ============================================
-- CRÉATION AUTOMATIQUE DES COMPTES AUTH
-- ============================================
-- Ce script crée automatiquement un compte
-- Supabase Auth pour chaque utilisateur de
-- public.users qui n'a pas encore auth_id
-- ============================================

-- ÉTAPE 1 : Voir les utilisateurs sans auth_id
SELECT '=== UTILISATEURS SANS AUTH_ID ===' as section;
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  actif,
  '❌ Pas de compte Auth' as status
FROM users
WHERE auth_id IS NULL
ORDER BY date_inscription;

-- ÉTAPE 2 : Instructions pour créer les comptes Auth
-- ============================================
-- IMPORTANT : Cette étape doit être faite MANUELLEMENT
-- car Supabase Auth nécessite une intervention humaine
-- ============================================
--
-- Pour chaque utilisateur SANS auth_id :
--
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Remplissez :
--    - Email : (l'email de l'utilisateur)
--    - Password : (mot de passe temporaire)
--    - Auto Confirm User : ✅ ON
-- 4. Cliquez sur "Create user"
-- 5. Copiez l'UUID (colonne UID)
-- 6. Exécutez la requête ci-dessous :
--
-- UPDATE users 
-- SET auth_id = 'UUID_COPIE_ICI' 
-- WHERE email = 'email@exemple.com';
--
-- ============================================

-- ÉTAPE 3 : Script pour lier tous les utilisateurs d'un coup
-- (après avoir créé les comptes Auth manuellement)

-- Exemple : Lier tous les utilisateurs actifs
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL
  AND u.actif = true;

-- ÉTAPE 4 : Vérification
SELECT '=== VÉRIFICATION APRÈS LIAISON ===' as section;
SELECT 
  email,
  role,
  actif,
  auth_id,
  CASE 
    WHEN auth_id IS NULL THEN '❌ Non lié'
    ELSE '✅ Lié'
  END as status
FROM users
ORDER BY date_inscription;

-- ÉTAPE 5 : Statistiques
SELECT '=== STATISTIQUES ===' as section;
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as with_auth,
  COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as without_auth,
  COUNT(CASE WHEN actif = true AND auth_id IS NULL THEN 1 END) as active_without_auth
FROM users;

-- ============================================
-- RECOMMANDATION
-- ============================================
-- Si vous avez des utilisateurs actifs sans auth_id,
-- créez leurs comptes Auth dans le Dashboard,
-- puis ré-exécutez ce script pour les lier.
-- ============================================
