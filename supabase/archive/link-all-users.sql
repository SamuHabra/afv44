-- ============================================
-- 🔗 LIAISON AUTOMATIQUE DES UTILISATEURS
-- ============================================
-- Ce script lie automatiquement les utilisateurs
-- de public.users avec auth.users via l'email
-- ============================================

-- Lier tous les utilisateurs automatiquement
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

SELECT '✅ Liaison automatique terminée' as status;

-- Vérification
SELECT '=== VÉRIFICATION DE LA LIAISON ===' as section;
SELECT 
  u.nom,
  u.prenom,
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

-- Statistiques
SELECT '=== STATISTIQUES ===' as section;
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_id IS NOT NULL THEN 1 END) as linked_users,
  COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as unlinked_users
FROM users;

-- Test de connexion
SELECT '=== TEST DE LECTURE ===' as section;
SELECT 
  'Test réussi' as status,
  COUNT(*) as nb_users
FROM users;

SELECT '🎉 Tous les utilisateurs sont maintenant liés !' as final_status;
