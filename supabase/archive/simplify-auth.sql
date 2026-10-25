-- ============================================
-- 🔐 SIMPLIFICATION AUTHENTIFICATION
-- ============================================
-- Ajoute le champ password_hash à la table users
-- Plus besoin de Supabase Auth
-- ============================================

-- ÉTAPE 1 : Ajouter le champ password_hash
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ÉTAPE 2 : Supprimer la dépendance à auth_id
ALTER TABLE users 
DROP COLUMN IF EXISTS auth_id;

-- ÉTAPE 3 : Mettre à jour les utilisateurs existants avec un mot de passe par défaut
-- Mot de passe par défaut : "Password123!"
-- En production, il faudrait hasher le mot de passe
UPDATE users 
SET password_hash = 'Password123!'
WHERE password_hash IS NULL;

-- ÉTAPE 4 : Créer les 5 utilisateurs si la table est vide
INSERT INTO users (nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine, first_login, password_changed, password_hash) 
SELECT * FROM (VALUES
  ('Diallo', 'Aminata', '+221 77 111 11 11', 'admin@tontine.pro', 'admin', true, NOW(), 1, true, false, 'Password123!'),
  ('Ndiaye', 'Fatou', '+221 77 222 22 22', 'presidente@tontine.pro', 'presidente', true, NOW(), 2, true, false, 'Password123!'),
  ('Sow', 'Mariama', '+221 77 333 33 33', 'tresoriere@tontine.pro', 'tresoriere', true, NOW(), 3, true, false, 'Password123!'),
  ('Ba', 'Aissatou', '+221 77 444 44 44', 'secretaire@tontine.pro', 'secretaire', true, NOW(), 4, true, false, 'Password123!'),
  ('Diop', 'Khadija', '+221 77 555 55 55', 'membre@tontine.pro', 'membre', true, NOW(), 5, true, false, 'Password123!')
) AS tmp(nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine, first_login, password_changed, password_hash)
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

SELECT '✅ Authentification simplifiée' as status;

-- Vérification
SELECT 
  telephone,
  nom,
  prenom,
  role,
  password_hash IS NOT NULL as has_password,
  first_login,
  password_changed
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'presidente' THEN 2
    WHEN 'tresoriere' THEN 3
    WHEN 'secretaire' THEN 4
    WHEN 'membre' THEN 5
  END;

SELECT '🎉 Connexion par téléphone + mot de passe activée !' as final_status;
