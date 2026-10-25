-- ============================================
-- TONTINE PRO - SCHÉMA COMPLET SUPABASE
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============= EXTENSIONS =============
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============= TABLES =============

-- Exercices (à créer en premier car référencé par d'autres tables)
CREATE TABLE IF NOT EXISTS exercices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  annee INTEGER NOT NULL,
  date_ouverture TIMESTAMP DEFAULT NOW(),
  date_cloture TIMESTAMP,
  statut TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'cloture')),
  solde_cloture NUMERIC
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'membre' CHECK (role IN ('admin', 'presidente', 'tresoriere', 'secretaire', 'membre')),
  actif BOOLEAN DEFAULT true,
  date_inscription TIMESTAMP DEFAULT NOW(),
  rang_tontine INTEGER
);

-- Caisses
CREATE TABLE IF NOT EXISTS caisses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  solde NUMERIC DEFAULT 0 NOT NULL,
  date_creation TIMESTAMP DEFAULT NOW(),
  actif BOOLEAN DEFAULT true
);

-- Mouvements
CREATE TABLE IF NOT EXISTS mouvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('cotisation', 'epargne', 'depense', 'penalite', 'don', 'remboursement', 'pret', 'distribution', 'interet')),
  montant NUMERIC NOT NULL,
  description TEXT,
  caisse_id UUID REFERENCES caisses(id),
  membre_id UUID REFERENCES users(id),
  date TIMESTAMP DEFAULT NOW(),
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'rejete')),
  valide_par UUID REFERENCES users(id),
  date_validation TIMESTAMP,
  motif_rejet TEXT
);

-- Prêts
CREATE TABLE IF NOT EXISTS prets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membre_id UUID NOT NULL REFERENCES users(id),
  montant NUMERIC NOT NULL,
  montant_restant NUMERIC NOT NULL,
  motif TEXT NOT NULL,
  taux_interet NUMERIC DEFAULT 5 NOT NULL,
  date_demande TIMESTAMP DEFAULT NOW(),
  date_approbation TIMESTAMP,
  date_echeance TIMESTAMP NOT NULL,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'en_cours', 'rembourse', 'rejete')),
  approuve_par UUID REFERENCES users(id),
  interets_generes NUMERIC DEFAULT 0
);

-- Remboursements
CREATE TABLE IF NOT EXISTS remboursements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pret_id UUID NOT NULL REFERENCES prets(id),
  montant NUMERIC NOT NULL,
  date TIMESTAMP DEFAULT NOW(),
  note TEXT
);

-- Réunions
CREATE TABLE IF NOT EXISTS reunions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  heure TEXT NOT NULL,
  lieu TEXT NOT NULL,
  description TEXT,
  ordre_du_jour TEXT[],
  decisions TEXT[],
  compte_rendu TEXT,
  presences JSONB DEFAULT '[]'::jsonb,
  total_cotisations NUMERIC DEFAULT 0,
  total_depenses NUMERIC DEFAULT 0,
  statut TEXT DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'annulee')),
  distribution_montant NUMERIC,
  exercice_id UUID REFERENCES exercices(id)
);

-- Tontines
CREATE TABLE IF NOT EXISTS tontines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  montant_par_rang NUMERIC NOT NULL,
  frequence TEXT NOT NULL CHECK (frequence IN ('hebdomadaire', 'mensuel', 'bimensuel')),
  date_debut TIMESTAMP NOT NULL,
  date_fin TIMESTAMP,
  statut TEXT DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'suspendue')),
  cycle_actuel INTEGER DEFAULT 1,
  exercice_id UUID REFERENCES exercices(id)
);

-- Rangs Tontine
CREATE TABLE IF NOT EXISTS rangs_tontine (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tontine_id UUID NOT NULL REFERENCES tontines(id),
  rang INTEGER NOT NULL,
  membre_id UUID NOT NULL REFERENCES users(id),
  date_prevue TIMESTAMP NOT NULL,
  date_effective TIMESTAMP,
  montant_recu NUMERIC DEFAULT 0,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'recu', 'reporte'))
);

-- Distributions
CREATE TABLE IF NOT EXISTS distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('interet_pret', 'tontine', 'bonus', 'dividende')),
  montant NUMERIC NOT NULL,
  beneficiaire_id UUID NOT NULL REFERENCES users(id),
  date TIMESTAMP DEFAULT NOW(),
  motif TEXT NOT NULL,
  source TEXT,
  statut TEXT DEFAULT 'prevue' CHECK (statut IN ('prevue', 'effectuee', 'annulee'))
);

-- Paramètres
CREATE TABLE IF NOT EXISTS parametres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  montant_cotisation NUMERIC DEFAULT 25000,
  penalite_retard NUMERIC DEFAULT 5000,
  taux_interet_pret NUMERIC DEFAULT 5,
  duree_max_pret_mois INTEGER DEFAULT 6,
  montant_max_pret NUMERIC DEFAULT 500000,
  frequence_reunion TEXT DEFAULT 'mensuel',
  jour_reunion TEXT DEFAULT 'dimanche',
  devise TEXT DEFAULT 'FCFA'
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Capital Temps (pour calcul des intérêts)
CREATE TABLE IF NOT EXISTS capital_temps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membre_id UUID NOT NULL REFERENCES users(id),
  exercice_id UUID NOT NULL REFERENCES exercices(id),
  montant NUMERIC NOT NULL,
  date_depot TIMESTAMP NOT NULL,
  duree_jours INTEGER NOT NULL,
  capital_temps NUMERIC NOT NULL
);

-- ============= INDEX =============
CREATE INDEX IF NOT EXISTS idx_mouvements_membre ON mouvements(membre_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_caisse ON mouvements(caisse_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_statut ON mouvements(statut);
CREATE INDEX IF NOT EXISTS idx_prets_membre ON prets(membre_id);
CREATE INDEX IF NOT EXISTS idx_prets_statut ON prets(statut);
CREATE INDEX IF NOT EXISTS idx_remboursements_pret ON remboursements(pret_id);
CREATE INDEX IF NOT EXISTS idx_rangs_tontine ON rangs_tontine(tontine_id);
CREATE INDEX IF NOT EXISTS idx_distributions_beneficiaire ON distributions(beneficiaire_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_capital_temps_membre ON capital_temps(membre_id, exercice_id);

-- ============= ROW LEVEL SECURITY =============

-- Activer RLS sur toutes les tables
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

-- Fonction helper pour récupérer le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Fonction helper pour vérifier si l'utilisateur est admin/bureau
CREATE OR REPLACE FUNCTION is_bureau() RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'presidente', 'tresoriere', 'secretaire') FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============= POLITIQUES RLS =============

-- USERS : Tout le monde peut voir les membres actifs, seul l'utilisateur voit ses propres données complètes
CREATE POLICY "users_select_all" ON users FOR SELECT USING (actif = true OR id = auth.uid());
CREATE POLICY "users_insert_bureau" ON users FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "users_update_bureau" ON users FOR UPDATE USING (is_bureau());

-- CAISSES : Bureau voit tout, membres ne voient rien directement
CREATE POLICY "caisses_select_bureau" ON caisses FOR SELECT USING (is_bureau());
CREATE POLICY "caisses_insert_bureau" ON caisses FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "caisses_update_bureau" ON caisses FOR UPDATE USING (is_bureau());

-- MOUVEMENTS : Bureau voit tout, membre voit ses propres mouvements
CREATE POLICY "mouvements_select" ON mouvements FOR SELECT USING (
  is_bureau() OR membre_id = auth.uid()
);
CREATE POLICY "mouvements_insert_all" ON mouvements FOR INSERT WITH CHECK (true);
CREATE POLICY "mouvements_update_bureau" ON mouvements FOR UPDATE USING (is_bureau());

-- PRETS : Bureau voit tout, membre voit ses propres prêts
CREATE POLICY "prets_select" ON prets FOR SELECT USING (
  is_bureau() OR membre_id = auth.uid()
);
CREATE POLICY "prets_insert_all" ON prets FOR INSERT WITH CHECK (true);
CREATE POLICY "prets_update_presidente" ON prets FOR UPDATE USING (
  get_user_role() = 'presidente' OR get_user_role() = 'admin'
);

-- REMBOURSEMENTS : Bureau voit tout, membre voit ses propres remboursements
CREATE POLICY "remboursements_select" ON remboursements FOR SELECT USING (
  is_bureau() OR EXISTS (
    SELECT 1 FROM prets WHERE prets.id = remboursements.pret_id AND prets.membre_id = auth.uid()
  )
);
CREATE POLICY "remboursements_insert" ON remboursements FOR INSERT WITH CHECK (true);

-- REUNIONS : Tout le monde peut voir, secrétaire gère les présences
CREATE POLICY "reunions_select_all" ON reunions FOR SELECT USING (true);
CREATE POLICY "reunions_insert_bureau" ON reunions FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "reunions_update_bureau" ON reunions FOR UPDATE USING (is_bureau());

-- TONTINES : Tout le monde peut voir, bureau gère
CREATE POLICY "tontines_select_all" ON tontines FOR SELECT USING (true);
CREATE POLICY "tontines_insert_bureau" ON tontines FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "tontines_update_bureau" ON tontines FOR UPDATE USING (is_bureau());

-- RANGS TONTINE : Tout le monde peut voir, bureau gère
CREATE POLICY "rangs_select_all" ON rangs_tontine FOR SELECT USING (true);
CREATE POLICY "rangs_insert_bureau" ON rangs_tontine FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "rangs_update_bureau" ON rangs_tontine FOR UPDATE USING (is_bureau());

-- DISTRIBUTIONS : Bureau voit tout, membre voit ses propres distributions
CREATE POLICY "distributions_select" ON distributions FOR SELECT USING (
  is_bureau() OR beneficiaire_id = auth.uid()
);
CREATE POLICY "distributions_insert_bureau" ON distributions FOR INSERT WITH CHECK (is_bureau());
CREATE POLICY "distributions_update_bureau" ON distributions FOR UPDATE USING (is_bureau());

-- EXERCICES : Tout le monde peut voir, admin gère
CREATE POLICY "exercices_select_all" ON exercices FOR SELECT USING (true);
CREATE POLICY "exercices_insert_admin" ON exercices FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "exercices_update_admin" ON exercices FOR UPDATE USING (get_user_role() = 'admin');

-- PARAMETRES : Bureau peut voir, admin modifie
CREATE POLICY "parametres_select_bureau" ON parametres FOR SELECT USING (is_bureau());
CREATE POLICY "parametres_insert_admin" ON parametres FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "parametres_update_admin" ON parametres FOR UPDATE USING (get_user_role() = 'admin');

-- AUDIT LOG : Bureau peut voir
CREATE POLICY "audit_log_select_bureau" ON audit_log FOR SELECT USING (is_bureau());
CREATE POLICY "audit_log_insert_system" ON audit_log FOR INSERT WITH CHECK (true);

-- CAPITAL TEMPS : Bureau voit tout, membre voit le sien
CREATE POLICY "capital_temps_select" ON capital_temps FOR SELECT USING (
  is_bureau() OR membre_id = auth.uid()
);

-- ============= FONCTIONS =============

-- Calcul du capital-temps pour un membre sur un exercice
CREATE OR REPLACE FUNCTION calculer_capital_temps(
  p_membre_id UUID,
  p_exercice_id UUID,
  p_date_fin DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
  v_capital_temps NUMERIC := 0;
  v_mouv RECORD;
  v_date_debut DATE;
BEGIN
  SELECT date_ouverture::date INTO v_date_debut FROM exercices WHERE id = p_exercice_id;
  
  FOR v_mouv IN 
    SELECT montant::NUMERIC, date::date 
    FROM mouvements 
    WHERE membre_id = p_membre_id 
    AND statut = 'valide'
    AND type IN ('cotisation', 'epargne')
    AND date >= (SELECT date_ouverture FROM exercices WHERE id = p_exercice_id)
  LOOP
    v_capital_temps := v_capital_temps + (v_mouv.montant * (p_date_fin - v_mouv.date));
  END LOOP;
  
  RETURN v_capital_temps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Répartition des intérêts selon la formule des capitaux pondérés
CREATE OR REPLACE FUNCTION repartir_interets(
  p_exercice_id UUID,
  p_interets_total NUMERIC
) RETURNS TABLE(membre_id UUID, nom_complet TEXT, capital_temps_calc NUMERIC, interets_attribues NUMERIC) AS $$
DECLARE
  v_total_capital_temps NUMERIC;
  v_date_fin DATE;
BEGIN
  SELECT date_cloture::date INTO v_date_fin FROM exercices WHERE id = p_exercice_id;
  IF v_date_fin IS NULL THEN
    v_date_fin := CURRENT_DATE;
  END IF;
  
  -- Calcul du total des capitaux-temps
  SELECT COALESCE(SUM(calculer_capital_temps(u.id, p_exercice_id, v_date_fin)), 0)
  INTO v_total_capital_temps
  FROM users u
  WHERE u.actif = true;
  
  -- Répartition proportionnelle
  RETURN QUERY
  SELECT 
    u.id,
    u.prenom || ' ' || u.nom,
    calculer_capital_temps(u.id, p_exercice_id, v_date_fin),
    CASE 
      WHEN v_total_capital_temps > 0 
      THEN (p_interets_total * calculer_capital_temps(u.id, p_exercice_id, v_date_fin) / v_total_capital_temps)
      ELSE 0
    END
  FROM users u
  WHERE u.actif = true
  ORDER BY calculer_capital_temps(u.id, p_exercice_id, v_date_fin) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider un mouvement (mise à jour du solde de la caisse)
CREATE OR REPLACE FUNCTION valider_mouvement(p_mouvement_id UUID, p_valide_par UUID) RETURNS VOID AS $$
DECLARE
  v_mouvement RECORD;
  v_is_credit BOOLEAN;
BEGIN
  SELECT * INTO v_mouvement FROM mouvements WHERE id = p_mouvement_id;
  
  IF v_mouvement IS NULL THEN
    RAISE EXCEPTION 'Mouvement non trouvé';
  END IF;
  
  IF v_mouvement.statut = 'valide' THEN
    RAISE EXCEPTION 'Mouvement déjà validé';
  END IF;
  
  v_is_credit := v_mouvement.type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet');
  
  -- Mise à jour du mouvement
  UPDATE mouvements 
  SET statut = 'valide', 
      valide_par = p_valide_par, 
      date_validation = NOW()
  WHERE id = p_mouvement_id;
  
  -- Mise à jour du solde de la caisse
  UPDATE caisses 
  SET solde = CASE 
    WHEN v_is_credit THEN solde + v_mouvement.montant::NUMERIC
    ELSE solde - v_mouvement.montant::NUMERIC
  END
  WHERE id = v_mouvement.caisse_id;
  
  -- Log d'audit
  INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
  VALUES (p_valide_par, 'valider_mouvement', 'mouvements', p_mouvement_id, 
          jsonb_build_object('montant', v_mouvement.montant, 'type', v_mouvement.type));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejeter un mouvement
CREATE OR REPLACE FUNCTION rejeter_mouvement(p_mouvement_id UUID, p_rejete_par UUID, p_motif TEXT) RETURNS VOID AS $$
BEGIN
  UPDATE mouvements 
  SET statut = 'rejete', 
      valide_par = p_rejete_par, 
      date_validation = NOW(),
      motif_rejet = p_motif
  WHERE id = p_mouvement_id AND statut = 'en_attente';
  
  INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
  VALUES (p_rejete_par, 'rejeter_mouvement', 'mouvements', p_mouvement_id, 
          jsonb_build_object('motif', p_motif));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============= DONNÉES INITIALES =============

-- Paramètres par défaut
INSERT INTO parametres (montant_cotisation, penalite_retard, taux_interet_pret, duree_max_pret_mois, montant_max_pret, devise)
VALUES (25000, 5000, 5, 6, 500000, 'FCFA');

-- Exercice 2025
INSERT INTO exercices (annee, statut) VALUES (2025, 'ouvert');

-- Membres de démonstration
INSERT INTO users (nom, prenom, telephone, role, actif) VALUES
('Diallo', 'Aminata', '+221 77 123 45 67', 'admin', true),
('Ndiaye', 'Fatou', '+221 77 234 56 78', 'presidente', true),
('Sow', 'Mariama', '+221 77 345 67 89', 'tresoriere', true),
('Ba', 'Aissatou', '+221 77 456 78 90', 'secretaire', true),
('Diop', 'Khadija', '+221 77 567 89 01', 'membre', true),
('Fall', 'Rama', '+221 77 678 90 12', 'membre', true),
('Sarr', 'Ndèye', '+221 77 789 01 23', 'membre', false),
('Gueye', 'Coumba', '+221 77 890 12 34', 'membre', true);

-- Caisses
INSERT INTO caisses (nom, description, solde) VALUES
('Caisse Principale', 'Caisse principale pour les cotisations mensuelles', 1250000),
('Caisse Épargne', 'Caisse d''épargne collective pour les projets futurs', 750000),
('Caisse Solidarité', 'Caisse pour les aides d''urgence et événements sociaux', 320000);

-- ============================================
-- FIN DU SCHÉMA
-- ============================================
