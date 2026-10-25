-- ============================================
-- ⚙️ MODULE PARAMÈTRES - MIGRATION BACKEND
-- ============================================
-- Cycle de vie de l'exercice (ouverture / clôture contrôlée / réouverture exceptionnelle),
-- gel des mouvements d'un exercice clôturé, paramètres validés et historisés,
-- barème des amendes, rôles avec règles, journal des actions sensibles
-- Prérequis : update-mon-espace.sql (auth_verifier), update-rapports.sql (rapport_coherence, archivage),
--             update-distribution-interets.sql, update-reunions.sql
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

-- ============= JOURNAL =============
CREATE TABLE IF NOT EXISTS journal_parametres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  date TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_parametres_date ON journal_parametres(date DESC);
ALTER TABLE journal_parametres DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.journal_parametres TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.journal_parametres FROM anon, authenticated;

-- ============= EXERCICES : colonnes et soldes figés =============
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS ouvert_par UUID REFERENCES users(id);
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS cloture_par UUID REFERENCES users(id);
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS motif_reouverture TEXT;

CREATE TABLE IF NOT EXISTS exercices_soldes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercice_id UUID NOT NULL REFERENCES exercices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ouverture', 'cloture')),
  caisse_id UUID REFERENCES caisses(id) ON DELETE SET NULL,
  caisse_nom TEXT NOT NULL,
  solde NUMERIC NOT NULL,
  date TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercices_soldes ON exercices_soldes(exercice_id, type);
ALTER TABLE exercices_soldes DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.exercices_soldes TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.exercices_soldes FROM anon, authenticated;

-- Un seul exercice ouvert à la fois, une seule ligne par année
-- (si des doublons existent déjà, l'index est ignoré avec un avertissement : corrigez-les puis relancez le script)
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_exercice_annee ON exercices(annee);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Index uniq_exercice_annee non créé : plusieurs exercices portent la même année (%)', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_exercice_ouvert ON exercices((true)) WHERE statut = 'ouvert';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Index uniq_exercice_ouvert non créé : plusieurs exercices sont ouverts (%)', SQLERRM;
END $$;

-- ============= OUTILS =============
CREATE OR REPLACE FUNCTION est_admin(p_user_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin' AND actif = true);
$$;

CREATE OR REPLACE FUNCTION journaliser(p_user_id UUID, p_action TEXT, p_details JSONB) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO journal_parametres (user_id, action, details) VALUES (p_user_id, p_action, p_details);
$$;
REVOKE EXECUTE ON FUNCTION journaliser(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ============= CONTRÔLE AVANT CLÔTURE =============
CREATE OR REPLACE FUNCTION controle_cloture(p_exercice_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ex exercices%ROWTYPE;
  v_bloq JSONB := '[]'::jsonb;
  v_avert JSONB := '[]'::jsonb;
  v_n INTEGER;
BEGIN
  SELECT * INTO v_ex FROM exercices WHERE id = p_exercice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('bloquants', jsonb_build_array(jsonb_build_object('code', 'introuvable', 'message', 'Exercice introuvable')), 'avertissements', '[]'::jsonb);
  END IF;
  IF v_ex.statut <> 'ouvert' THEN
    RETURN jsonb_build_object('bloquants', jsonb_build_array(jsonb_build_object('code', 'deja_cloture', 'message', 'Cet exercice est déjà clôturé')), 'avertissements', '[]'::jsonb);
  END IF;

  -- Bloquants
  SELECT COUNT(*) INTO v_n FROM mouvements WHERE statut = 'en_attente';
  IF v_n > 0 THEN v_bloq := v_bloq || jsonb_build_array(jsonb_build_object('code', 'mouvements_en_attente', 'nombre', v_n, 'message', v_n || ' mouvement(s) en attente de validation')); END IF;

  SELECT COUNT(*) INTO v_n FROM reunions WHERE statut = 'en_cours';
  IF v_n > 0 THEN v_bloq := v_bloq || jsonb_build_array(jsonb_build_object('code', 'reunion_en_cours', 'nombre', v_n, 'message', v_n || ' réunion(s) en cours à terminer')); END IF;

  SELECT COUNT(*) INTO v_n FROM distributions_interets WHERE statut <> 'executee';
  IF v_n > 0 THEN v_bloq := v_bloq || jsonb_build_array(jsonb_build_object('code', 'distribution_interets', 'nombre', v_n, 'message', 'Une distribution d''intérêts n''est pas exécutée (brouillon ou validée)')); END IF;

  SELECT COUNT(*) INTO v_n FROM jsonb_array_elements(rapport_coherence()) x WHERE abs((x->>'ecart')::NUMERIC) >= 1;
  IF v_n > 0 THEN v_bloq := v_bloq || jsonb_build_array(jsonb_build_object('code', 'ecart_caisses', 'nombre', v_n, 'message', v_n || ' caisse(s) dont le solde ne correspond pas aux mouvements validés (voir Rapports > Cohérence)')); END IF;

  -- Avertissements
  SELECT COUNT(*) INTO v_n FROM prets WHERE statut IN ('approuve', 'en_cours') AND montant_restant > 0;
  IF v_n > 0 THEN v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'prets_en_cours', 'nombre', v_n, 'message', v_n || ' prêt(s) en cours : ils se poursuivent sur le nouvel exercice')); END IF;

  SELECT COUNT(*) INTO v_n FROM tontines WHERE statut = 'en_cours';
  IF v_n > 0 THEN v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'tontines_en_cours', 'nombre', v_n, 'message', v_n || ' tontine(s) en cours : elles se poursuivent')); END IF;

  SELECT COUNT(*) INTO v_n FROM caisses WHERE actif = true AND type IN ('cassation', 'charite') AND solde > 0;
  IF v_n > 0 THEN v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'repartition_fin_annee', 'nombre', v_n, 'message', 'Les caisses Cassation et Charité ne sont pas réparties par cette clôture (répartition de fin d''année à faire à part)')); END IF;

  IF NOW() < make_timestamp(v_ex.annee, 12, 31, 0, 0, 0) THEN
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'avant_fin_annee', 'message', 'La clôture a lieu avant le 31 décembre ' || v_ex.annee));
  END IF;

  RETURN jsonb_build_object('bloquants', v_bloq, 'avertissements', v_avert);
END;
$$;

-- ============= CLÔTURE =============
CREATE OR REPLACE FUNCTION cloturer_exercice(p_exercice_id UUID, p_user_id UUID, p_password TEXT, p_confirmation TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ex exercices%ROWTYPE;
  v_controle JSONB;
  v_total NUMERIC;
BEGIN
  IF NOT est_admin(p_user_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  IF NOT auth_verifier(p_user_id, p_password) THEN RETURN jsonb_build_object('ok', false, 'error', 'Mot de passe incorrect'); END IF;

  SELECT * INTO v_ex FROM exercices WHERE id = p_exercice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Exercice introuvable'); END IF;
  IF translate(upper(trim(COALESCE(p_confirmation, ''))), 'Ô', 'O') <> 'CLOTURER ' || v_ex.annee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Confirmation incorrecte : tapez CLÔTURER ' || v_ex.annee);
  END IF;

  v_controle := controle_cloture(p_exercice_id);
  IF jsonb_array_length(v_controle->'bloquants') > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La clôture est bloquée', 'bloquants', v_controle->'bloquants');
  END IF;

  INSERT INTO exercices_soldes (exercice_id, type, caisse_id, caisse_nom, solde)
  SELECT p_exercice_id, 'cloture', c.id, c.nom, c.solde FROM caisses c WHERE c.actif = true;
  SELECT COALESCE(SUM(solde), 0) INTO v_total FROM caisses WHERE actif = true;

  -- L'archivage du rapport financier se fait par le déclencheur archiver_cloture_exercice
  UPDATE exercices SET statut = 'cloture', date_cloture = NOW(), solde_cloture = v_total, cloture_par = p_user_id WHERE id = p_exercice_id;

  PERFORM journaliser(p_user_id, 'exercice_cloture', jsonb_build_object('annee', v_ex.annee, 'solde_cloture', v_total, 'avertissements', v_controle->'avertissements'));
  RETURN jsonb_build_object('ok', true, 'solde_cloture', v_total);
END;
$$;

-- ============= OUVERTURE =============
CREATE OR REPLACE FUNCTION ouvrir_exercice(p_annee INTEGER, p_user_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_derniere exercices%ROWTYPE;
  v_id UUID;
  v_date TIMESTAMP;
BEGIN
  IF NOT est_admin(p_user_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  IF p_annee IS NULL OR p_annee < 2000 OR p_annee > 2100 THEN RETURN jsonb_build_object('ok', false, 'error', 'Année invalide'); END IF;
  IF EXISTS (SELECT 1 FROM exercices WHERE statut = 'ouvert') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Un exercice est déjà ouvert : clôturez-le avant d''en ouvrir un autre');
  END IF;
  IF EXISTS (SELECT 1 FROM exercices WHERE annee = p_annee) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'L''exercice ' || p_annee || ' existe déjà');
  END IF;

  SELECT * INTO v_derniere FROM exercices ORDER BY annee DESC LIMIT 1;
  IF FOUND AND p_annee < v_derniere.annee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'L''année doit être postérieure à ' || v_derniere.annee);
  END IF;

  -- Continuité : le nouvel exercice démarre là où le précédent s'est arrêté
  v_date := COALESCE(v_derniere.date_cloture, make_timestamp(p_annee, 1, 1, 0, 0, 0));
  INSERT INTO exercices (annee, date_ouverture, statut, ouvert_par) VALUES (p_annee, v_date, 'ouvert', p_user_id) RETURNING id INTO v_id;

  INSERT INTO exercices_soldes (exercice_id, type, caisse_id, caisse_nom, solde)
  SELECT v_id, 'ouverture', c.id, c.nom, c.solde FROM caisses c WHERE c.actif = true;

  PERFORM journaliser(p_user_id, 'exercice_ouvert', jsonb_build_object('annee', p_annee, 'date_ouverture', v_date));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ============= RÉOUVERTURE EXCEPTIONNELLE =============
CREATE OR REPLACE FUNCTION rouvrir_exercice(p_exercice_id UUID, p_user_id UUID, p_password TEXT, p_motif TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ex exercices%ROWTYPE;
BEGIN
  IF NOT est_admin(p_user_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  IF NOT auth_verifier(p_user_id, p_password) THEN RETURN jsonb_build_object('ok', false, 'error', 'Mot de passe incorrect'); END IF;
  IF p_motif IS NULL OR length(trim(p_motif)) < 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'Le motif doit contenir au moins 10 caractères'); END IF;

  SELECT * INTO v_ex FROM exercices WHERE id = p_exercice_id FOR UPDATE;
  IF NOT FOUND OR v_ex.statut <> 'cloture' THEN RETURN jsonb_build_object('ok', false, 'error', 'Seul un exercice clôturé peut être rouvert'); END IF;
  IF EXISTS (SELECT 1 FROM exercices WHERE annee > v_ex.annee) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Un exercice plus récent existe : la réouverture n''est plus possible');
  END IF;

  DELETE FROM exercices_soldes WHERE exercice_id = p_exercice_id AND type = 'cloture';
  UPDATE exercices SET statut = 'ouvert', date_cloture = NULL, solde_cloture = NULL, cloture_par = NULL, motif_reouverture = trim(p_motif) WHERE id = p_exercice_id;

  PERFORM journaliser(p_user_id, 'exercice_rouvert', jsonb_build_object('annee', v_ex.annee, 'motif', trim(p_motif)));
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============= GEL DES MOUVEMENTS D'UN EXERCICE CLÔTURÉ =============
CREATE OR REPLACE FUNCTION trg_gel_exercice() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.statut IS NOT DISTINCT FROM OLD.statut AND NEW.date IS NOT DISTINCT FROM OLD.date THEN
    RETURN NEW;   -- autre modification (lien réunion, tontine...) : pas concernée
  END IF;
  IF EXISTS (SELECT 1 FROM exercices e WHERE e.statut = 'cloture' AND NEW.date >= e.date_ouverture AND NEW.date <= e.date_cloture) THEN
    RAISE EXCEPTION 'Exercice clôturé : aucun mouvement ne peut être créé ou validé à une date comprise dans un exercice clôturé';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS gel_exercice ON mouvements;
CREATE TRIGGER gel_exercice BEFORE INSERT OR UPDATE ON mouvements FOR EACH ROW EXECUTE FUNCTION trg_gel_exercice();

-- ============= PARAMÈTRES VALIDÉS ET HISTORISÉS =============
CREATE OR REPLACE FUNCTION modifier_parametres(p_user_id UUID, p_data JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old parametres%ROWTYPE;
  v_cotisation NUMERIC; v_penalite NUMERIC; v_taux NUMERIC; v_duree INTEGER; v_max NUMERIC;
  v_freq TEXT; v_jour TEXT; v_devise TEXT;
  v_changes JSONB := '{}'::jsonb;
BEGIN
  IF NOT est_admin(p_user_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  SELECT * INTO v_old FROM parametres LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Aucune ligne de paramètres en base'); END IF;

  v_cotisation := COALESCE((p_data->>'montant_cotisation')::NUMERIC, v_old.montant_cotisation);
  v_penalite := COALESCE((p_data->>'penalite_retard')::NUMERIC, v_old.penalite_retard);
  v_taux := COALESCE((p_data->>'taux_interet_pret')::NUMERIC, v_old.taux_interet_pret);
  v_duree := COALESCE((p_data->>'duree_max_pret_mois')::INTEGER, v_old.duree_max_pret_mois);
  v_max := COALESCE((p_data->>'montant_max_pret')::NUMERIC, v_old.montant_max_pret);
  v_freq := COALESCE(p_data->>'frequence_reunion', v_old.frequence_reunion);
  v_jour := COALESCE(p_data->>'jour_reunion', v_old.jour_reunion);
  v_devise := COALESCE(NULLIF(trim(p_data->>'devise'), ''), v_old.devise);

  IF v_cotisation < 0 OR v_penalite < 0 OR v_max < 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Les montants ne peuvent pas être négatifs'); END IF;
  IF v_taux < 0 OR v_taux > 100 THEN RETURN jsonb_build_object('ok', false, 'error', 'Le taux d''intérêt doit être compris entre 0 et 100'); END IF;
  IF v_duree < 1 OR v_duree > 120 THEN RETURN jsonb_build_object('ok', false, 'error', 'La durée maximale doit être comprise entre 1 et 120 mois'); END IF;
  IF v_freq NOT IN ('hebdomadaire', 'bimensuel', 'mensuel') THEN RETURN jsonb_build_object('ok', false, 'error', 'Fréquence de réunion invalide'); END IF;
  IF v_jour NOT IN ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche') THEN RETURN jsonb_build_object('ok', false, 'error', 'Jour de réunion invalide'); END IF;
  IF length(v_devise) > 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'Devise trop longue'); END IF;

  IF v_cotisation IS DISTINCT FROM v_old.montant_cotisation THEN v_changes := v_changes || jsonb_build_object('montant_cotisation', jsonb_build_object('ancien', v_old.montant_cotisation, 'nouveau', v_cotisation)); END IF;
  IF v_penalite IS DISTINCT FROM v_old.penalite_retard THEN v_changes := v_changes || jsonb_build_object('penalite_retard', jsonb_build_object('ancien', v_old.penalite_retard, 'nouveau', v_penalite)); END IF;
  IF v_taux IS DISTINCT FROM v_old.taux_interet_pret THEN v_changes := v_changes || jsonb_build_object('taux_interet_pret', jsonb_build_object('ancien', v_old.taux_interet_pret, 'nouveau', v_taux)); END IF;
  IF v_duree IS DISTINCT FROM v_old.duree_max_pret_mois THEN v_changes := v_changes || jsonb_build_object('duree_max_pret_mois', jsonb_build_object('ancien', v_old.duree_max_pret_mois, 'nouveau', v_duree)); END IF;
  IF v_max IS DISTINCT FROM v_old.montant_max_pret THEN v_changes := v_changes || jsonb_build_object('montant_max_pret', jsonb_build_object('ancien', v_old.montant_max_pret, 'nouveau', v_max)); END IF;
  IF v_freq IS DISTINCT FROM v_old.frequence_reunion THEN v_changes := v_changes || jsonb_build_object('frequence_reunion', jsonb_build_object('ancien', v_old.frequence_reunion, 'nouveau', v_freq)); END IF;
  IF v_jour IS DISTINCT FROM v_old.jour_reunion THEN v_changes := v_changes || jsonb_build_object('jour_reunion', jsonb_build_object('ancien', v_old.jour_reunion, 'nouveau', v_jour)); END IF;
  IF v_devise IS DISTINCT FROM v_old.devise THEN v_changes := v_changes || jsonb_build_object('devise', jsonb_build_object('ancien', v_old.devise, 'nouveau', v_devise)); END IF;

  IF v_changes = '{}'::jsonb THEN RETURN jsonb_build_object('ok', true, 'inchange', true); END IF;

  UPDATE parametres SET montant_cotisation = v_cotisation, penalite_retard = v_penalite, taux_interet_pret = v_taux,
    duree_max_pret_mois = v_duree, montant_max_pret = v_max, frequence_reunion = v_freq, jour_reunion = v_jour, devise = v_devise
  WHERE id = v_old.id;

  PERFORM journaliser(p_user_id, 'parametres_modifies', v_changes);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============= BARÈME DES AMENDES =============
CREATE OR REPLACE FUNCTION modifier_bareme_amende(p_user_id UUID, p_code TEXT, p_libelle TEXT, p_montant NUMERIC) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old types_amende%ROWTYPE;
BEGIN
  IF NOT est_admin(p_user_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  IF p_montant IS NULL OR p_montant < 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Montant invalide'); END IF;
  IF p_libelle IS NULL OR length(trim(p_libelle)) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Libellé obligatoire'); END IF;
  SELECT * INTO v_old FROM types_amende WHERE code = p_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Type d''amende introuvable'); END IF;
  UPDATE types_amende SET libelle = trim(p_libelle), montant = p_montant WHERE code = p_code;
  PERFORM journaliser(p_user_id, 'bareme_amende_modifie', jsonb_build_object('code', p_code,
    'ancien', jsonb_build_object('libelle', v_old.libelle, 'montant', v_old.montant), 'nouveau', jsonb_build_object('libelle', trim(p_libelle), 'montant', p_montant)));
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============= RÔLES =============
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'presidente', 'secretaire', 'tresoriere', 'commissaire', 'animatrice', 'conseillere', 'membre'));

CREATE OR REPLACE FUNCTION modifier_role(p_admin_id UUID, p_membre_id UUID, p_role TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_membre users%ROWTYPE;
  v_autre users%ROWTYPE;
BEGIN
  IF NOT est_admin(p_admin_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Réservé à l''administratrice'); END IF;
  IF p_role NOT IN ('admin', 'presidente', 'secretaire', 'tresoriere', 'commissaire', 'animatrice', 'conseillere', 'membre') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rôle invalide');
  END IF;
  SELECT * INTO v_membre FROM users WHERE id = p_membre_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Membre introuvable'); END IF;
  IF v_membre.role = p_role THEN RETURN jsonb_build_object('ok', true, 'inchange', true); END IF;

  -- Protège le dernier compte administrateur
  IF v_membre.role = 'admin' AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' AND actif = true AND id <> p_membre_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Impossible : ce membre est la dernière administratrice');
  END IF;

  -- Une seule personne active pour ces fonctions
  IF p_role IN ('presidente', 'secretaire', 'tresoriere') THEN
    SELECT * INTO v_autre FROM users WHERE role = p_role AND actif = true AND id <> p_membre_id LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', v_autre.prenom || ' ' || v_autre.nom || ' occupe déjà cette fonction : changez d''abord son rôle');
    END IF;
  END IF;

  UPDATE users SET role = p_role WHERE id = p_membre_id;
  PERFORM journaliser(p_admin_id, 'role_modifie', jsonb_build_object('membre', v_membre.prenom || ' ' || v_membre.nom, 'ancien', v_membre.role, 'nouveau', p_role));
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============= DROITS =============
-- Les exercices et les paramètres ne se modifient plus qu'à travers ces fonctions
REVOKE INSERT, UPDATE, DELETE ON public.exercices FROM anon, authenticated;
REVOKE UPDATE ON public.parametres FROM anon, authenticated;
GRANT SELECT ON public.exercices TO anon, authenticated;
GRANT SELECT ON public.parametres TO anon, authenticated;

GRANT EXECUTE ON FUNCTION controle_cloture(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cloturer_exercice(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION ouvrir_exercice(INTEGER, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rouvrir_exercice(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION modifier_parametres(UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION modifier_bareme_amende(UUID, TEXT, TEXT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION modifier_role(UUID, UUID, TEXT) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION est_admin(UUID) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Module paramètres migré' as status;
