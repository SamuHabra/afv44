-- ============================================
-- INSERTION DES UTILISATEURS INITIAUX
-- ============================================
-- À exécuter APRÈS migration-auth.sql
-- Les IDs sont générés automatiquement par PostgreSQL
-- ============================================

-- Supprimer les utilisateurs existants (optionnel)
-- DELETE FROM users;

-- Insérer les utilisateurs avec emails (sans spécifier l'ID)
INSERT INTO users (nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine, first_login, password_changed) VALUES
('Diallo', 'Aminata', '+221 77 123 45 67', 'aminata@tontine.pro', 'admin', true, '2024-01-15', 1, true, false),
('Ndiaye', 'Fatou', '+221 77 234 56 78', 'fatou@tontine.pro', 'presidente', true, '2024-01-15', 2, true, false),
('Sow', 'Mariama', '+221 77 345 67 89', 'mariama@tontine.pro', 'tresoriere', true, '2024-02-01', 3, true, false),
('Ba', 'Aissatou', '+221 77 456 78 90', 'aissatou@tontine.pro', 'secretaire', true, '2024-02-10', 4, true, false),
('Diop', 'Khadija', '+221 77 567 89 01', 'khadija@tontine.pro', 'membre', true, '2024-03-01', 5, true, false),
('Fall', 'Rama', '+221 77 678 90 12', 'rama@tontine.pro', 'membre', true, '2024-03-15', 6, true, false),
('Sarr', 'Ndèye', '+221 77 789 01 23', 'ndeye@tontine.pro', 'membre', false, '2024-01-20', 7, true, false),
('Gueye', 'Coumba', '+221 77 890 12 34', 'coumba@tontine.pro', 'membre', true, '2024-04-01', 8, true, false);

-- Vérification
SELECT '✅ Utilisateurs insérés' as status;
SELECT id, nom, prenom, email, role, actif, first_login FROM users ORDER BY date_inscription;

-- ============================================
-- ÉTAPE SUIVANTE : Créer les comptes Supabase Auth
-- ============================================
-- Pour chaque utilisateur ci-dessus :
-- 1. Allez dans Supabase Dashboard → Authentication → Users
-- 2. Cliquez sur "Add user" → "Create new user"
-- 3. Entrez l'email et un mot de passe temporaire
-- 4. Activez "Auto Confirm User"
-- 5. Copiez l'UUID de l'utilisateur créé
-- 6. Exécutez la requête ci-dessous pour relier auth_id
--
-- Exemple :
-- UPDATE users SET auth_id = 'VOTRE_UUID_ICI' WHERE email = 'aminata@tontine.pro';
-- ============================================
