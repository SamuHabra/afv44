-- ============================================
-- 📜 ALIGNEMENT SUR LES STATUTS (adoptés le 12 janvier 2026)
-- ============================================
-- Art. 22 : ration mensuelle 2 000 FCFA
-- Art. 23 : retard 500 FCFA (après 1 h)
-- Art. 24 : prêts remboursés en 3 mois maximum, intérêt 5 %/mois
-- Art. 11 : réunion ordinaire le 2ème samedi du mois
-- Idempotent. À exécuter dans le SQL Editor (en tant que propriétaire : le script modifie directement la table).
-- ============================================

UPDATE parametres SET
  montant_cotisation = 2000,
  penalite_retard = 500,
  taux_interet_pret = 5,
  duree_max_pret_mois = 3,
  frequence_reunion = 'mensuel',
  jour_reunion = 'samedi';

-- Valeurs par défaut pour les futures installations
ALTER TABLE parametres ALTER COLUMN montant_cotisation SET DEFAULT 2000;
ALTER TABLE parametres ALTER COLUMN penalite_retard SET DEFAULT 500;
ALTER TABLE parametres ALTER COLUMN duree_max_pret_mois SET DEFAULT 3;

-- Cotisations annuelles des caisses (art. 21)
UPDATE caisses SET montant_annuel = 10000 WHERE type IN ('cassation', 'charite') AND montant_annuel IS DISTINCT FROM 10000;
UPDATE caisses SET montant_annuel = 15000 WHERE type = 'secours' AND montant_annuel IS DISTINCT FROM 15000;

-- Barème des amendes (art. 23)
UPDATE types_amende SET montant = 500  WHERE code = 'retard';
UPDATE types_amende SET montant = 100  WHERE code = 'bavardage';
UPDATE types_amende SET montant = 2000 WHERE code = 'querelle';
UPDATE types_amende SET montant = 1000 WHERE code IN ('dresscode', 'cotisation');

SELECT montant_cotisation, penalite_retard, taux_interet_pret, duree_max_pret_mois, jour_reunion FROM parametres;
