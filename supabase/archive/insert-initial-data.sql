-- ============================================
-- INSÉRER LES DONNÉES INITIALES
-- ============================================
-- À exécuter si les tables sont vides
-- ============================================

-- Paramètres par défaut
INSERT INTO parametres (montant_cotisation, penalite_retard, taux_interet_pret, duree_max_pret_mois, montant_max_pret, devise)
VALUES (25000, 5000, 5, 6, 500000, 'FCFA')
ON CONFLICT DO NOTHING;

-- Exercice 2025
INSERT INTO exercices (annee, statut) 
VALUES (2025, 'ouvert')
ON CONFLICT DO NOTHING;

-- Membres de démonstration
INSERT INTO users (nom, prenom, telephone, role, actif) VALUES
('Diallo', 'Aminata', '+221 77 123 45 67', 'admin', true),
('Ndiaye', 'Fatou', '+221 77 234 56 78', 'presidente', true),
('Sow', 'Mariama', '+221 77 345 67 89', 'tresoriere', true),
('Ba', 'Aissatou', '+221 77 456 78 90', 'secretaire', true),
('Diop', 'Khadija', '+221 77 567 89 01', 'membre', true),
('Fall', 'Rama', '+221 77 678 90 12', 'membre', true),
('Sarr', 'Ndèye', '+221 77 789 01 23', 'membre', false),
('Gueye', 'Coumba', '+221 77 890 12 34', 'membre', true)
ON CONFLICT (telephone) DO NOTHING;

-- Caisses
INSERT INTO caisses (nom, description, solde) VALUES
('Caisse Principale', 'Caisse principale pour les cotisations mensuelles', 1250000),
('Caisse Épargne', 'Caisse d''épargne collective pour les projets futurs', 750000),
('Caisse Solidarité', 'Caisse pour les aides d''urgence et événements sociaux', 320000)
ON CONFLICT DO NOTHING;

-- Vérification
SELECT '✅ Données insérées' as status;
SELECT COUNT(*) as "Nombre d'utilisateurs" FROM users;
SELECT COUNT(*) as "Nombre de caisses" FROM caisses;
SELECT COUNT(*) as "Nombre de paramètres" FROM parametres;
