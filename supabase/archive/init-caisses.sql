-- ============================================
-- 🏦 INITIALISATION DES CAISSES - A.F.F.M.M.
-- ============================================
-- 8 caisses principales + événements + amendes
-- ============================================

-- ÉTAPE 1 : Supprimer les caisses existantes (si nécessaire)
DELETE FROM caisses;

-- ÉTAPE 2 : Créer les 8 caisses principales
INSERT INTO caisses (nom, description, type, montant_annuel, solde, actif, systeme) VALUES
-- Caisses obligatoires (annuelles)
('Caisse Cassation', 'Tontine annuelle - 10 000 FCFA/an - Distribution en fin d''année', 'cassation', 10000, 0, true, true),
('Caisse Charité', 'Soutien aux nécessiteux - 10 000 FCFA/an - Distribution fin d''année', 'charite', 10000, 0, true, true),
('Caisse Secours', 'Assurance événements heureux/tristes - 15 000 FCFA/an', 'secours', 15000, 0, true, true),

-- Caisses facultatives
('Épargne Individuelle', 'Épargne personnelle des membres - Montant variable', 'epargne', NULL, 0, true, true),
('Caisse Scolaire', 'Frais scolaires des enfants - Montant variable', 'scolaire', NULL, 0, true, true),

-- Caisses de fonctionnement
('Caisse Amendes', 'Collecte des amendes pendant les séances', 'amendes', NULL, 0, true, true),
('Caisse Tontine', 'Tontine mensuelle - Montant variable selon participants', 'tontine', NULL, 0, true, true),
('Caisse Intérêts', 'Intérêts générés - Distribution fin d''année', 'interets', NULL, 0, true, true);

SELECT '✅ 8 caisses créées' as status;

-- ÉTAPE 3 : Vérification
SELECT nom, description, type, montant_annuel, solde, systeme
FROM caisses
ORDER BY 
  CASE type
    WHEN 'cassation' THEN 1
    WHEN 'charite' THEN 2
    WHEN 'secours' THEN 3
    WHEN 'epargne' THEN 4
    WHEN 'scolaire' THEN 5
    WHEN 'amendes' THEN 6
    WHEN 'tontine' THEN 7
    WHEN 'interets' THEN 8
  END;

-- ÉTAPE 4 : Ajouter la colonne 'systeme' si elle n'existe pas
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS montant_annuel NUMERIC;
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS systeme BOOLEAN DEFAULT false;

SELECT '✅ Schéma mis à jour' as final_status;
