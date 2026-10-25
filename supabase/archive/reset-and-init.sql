-- ============================================
-- 🔄 RÉINITIALISATION COMPLÈTE DE LA BASE
-- ============================================
-- Ce script :
-- 1. Vide TOUTES les tables
-- 2. Crée 5 utilisateurs (un par rôle)
-- 3. Prépare la liaison avec Supabase Auth
-- ============================================

-- ⚠️ ATTENTION : Ce script supprime TOUTES les données !
-- Faites une sauvegarde avant si nécessaire.

-- ============================================
-- ÉTAPE 1 : VIDAGE DES TABLES
-- ============================================

-- Désactiver temporairement RLS pour le nettoyage
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE caisses DISABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements DISABLE ROW LEVEL SECURITY;
ALTER TABLE prets DISABLE ROW LEVEL SECURITY;
ALTER TABLE remboursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE reunions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tontines DISABLE ROW LEVEL SECURITY;
ALTER TABLE rangs_tontine DISABLE ROW LEVEL SECURITY;
ALTER TABLE distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercices DISABLE ROW LEVEL SECURITY;
ALTER TABLE parametres DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE capital_temps DISABLE ROW LEVEL SECURITY;

-- Supprimer les données (ordre important à cause des FK)
DELETE FROM capital_temps;
DELETE FROM audit_log;
DELETE FROM distributions;
DELETE FROM rangs_tontine;
DELETE FROM tontines;
DELETE FROM reunions;
DELETE FROM remboursements;
DELETE FROM prets;
DELETE FROM mouvements;
DELETE FROM caisses;
DELETE FROM parametres;
DELETE FROM exercices;
DELETE FROM users;

SELECT '✅ Toutes les tables vidées' as status;

-- ============================================
-- ÉTAPE 2 : CRÉATION DES 5 UTILISATEURS
-- ============================================
-- Un utilisateur pour chaque rôle :
-- 1. Admin (Administrateur)
-- 2. Presidente (Présidente)
-- 3. Tresoriere (Trésorière)
-- 4. Secretaire (Secrétaire)
-- 5. Membre (Membre simple)
-- ============================================

INSERT INTO users (nom, prenom, email, telephone, role, actif, date_inscription, rang_tontine, first_login, password_changed) VALUES
-- 1. ADMIN
('Diallo', 'Aminata', 'admin@tontine.pro', '+221 77 111 11 11', 'admin', true, NOW(), 1, true, false),

-- 2. PRESIDENTE
('Ndiaye', 'Fatou', 'presidente@tontine.pro', '+221 77 222 22 22', 'presidente', true, NOW(), 2, true, false),

-- 3. TRESORIERE
('Sow', 'Mariama', 'tresoriere@tontine.pro', '+221 77 333 33 33', 'tresoriere', true, NOW(), 3, true, false),

-- 4. SECRETAIRE
('Ba', 'Aissatou', 'secretaire@tontine.pro', '+221 77 444 44 44', 'secretaire', true, NOW(), 4, true, false),

-- 5. MEMBRE
('Diop', 'Khadija', 'membre@tontine.pro', '+221 77 555 55 55', 'membre', true, NOW(), 5, true, false);

SELECT '✅ 5 utilisateurs créés' as status;

-- ============================================
-- ÉTAPE 3 : CRÉATION DES CAISSES
-- ============================================

INSERT INTO caisses (nom, description, solde) VALUES
('Caisse Principale', 'Caisse principale pour les cotisations mensuelles', 0),
('Caisse Épargne', 'Caisse d''épargne collective pour les projets futurs', 0),
('Caisse Solidarité', 'Caisse pour les aides d''urgence et événements sociaux', 0);

SELECT '✅ 3 caisses créées' as status;

-- ============================================
-- ÉTAPE 4 : CRÉATION DES PARAMÈTRES
-- ============================================

INSERT INTO parametres (montant_cotisation, penalite_retard, taux_interet_pret, duree_max_pret_mois, montant_max_pret, devise, frequence_reunion, jour_reunion) VALUES
(25000, 5000, 5, 6, 500000, 'FCFA', 'mensuel', 'dimanche');

SELECT '✅ Paramètres créés' as status;

-- ============================================
-- ÉTAPE 5 : CRÉATION DE L'EXERCICE
-- ============================================

INSERT INTO exercices (annee, statut) VALUES
(EXTRACT(YEAR FROM NOW())::INTEGER, 'ouvert');

SELECT '✅ Exercice créé' as status;

-- ============================================
-- ÉTAPE 6 : RÉACTIVER RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE caisses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE prets ENABLE ROW LEVEL SECURITY;
ALTER TABLE remboursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tontines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rangs_tontine ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercices ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_temps ENABLE ROW LEVEL SECURITY;

SELECT '✅ RLS réactivé' as status;

-- ============================================
-- ÉTAPE 7 : VÉRIFICATION
-- ============================================

SELECT '=== UTILISATEURS CRÉÉS ===' as section;
SELECT 
  id,
  nom,
  prenom,
  email,
  telephone,
  role,
  actif,
  auth_id,
  CASE WHEN auth_id IS NULL THEN '⏳ En attente de liaison' ELSE '✅ Lié' END as auth_status
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'presidente' THEN 2
    WHEN 'tresoriere' THEN 3
    WHEN 'secretaire' THEN 4
    WHEN 'membre' THEN 5
  END;

-- ============================================
-- 📋 INSTRUCTIONS POUR LA LIAISON AUTH
-- ============================================
-- 
-- MAINTENANT, vous devez créer les 5 comptes dans Supabase Auth :
--
-- Pour CHAQUE utilisateur ci-dessus :
--
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Remplissez :
--    - Email : (voir la liste ci-dessus)
--    - Password : "Password123!" (ou un autre mot de passe)
--    - Auto Confirm User : ✅ ON
-- 4. Cliquez sur "Create user"
-- 5. Répétez pour les 5 utilisateurs
--
-- EMAILS À CRÉER :
-- 1. admin@tontine.pro
-- 2. presidente@tontine.pro
-- 3. tresoriere@tontine.pro
-- 4. secretaire@tontine.pro
-- 5. membre@tontine.pro
--
-- APRÈS avoir créé les 5 comptes, exécutez le script :
-- supabase/link-all-users.sql
-- ============================================

SELECT '🎉 Réinitialisation terminée ! Créez maintenant les 5 comptes Auth.' as final_status;
