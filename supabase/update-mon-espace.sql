-- ============================================
-- 👤 MODULE MON ESPACE - MIGRATION BACKEND
-- ============================================
-- 1. Mots de passe hachés (bcrypt) + verrouillage anti force brute + journal de connexions
-- 2. Situation personnelle d'un membre calculée en base (situation_membre)
-- 3. Notifications automatiques (mouvements, prêts, tontine, distribution d'intérêts)
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;

-- ============= JOURNAL DE CONNEXIONS =============
CREATE TABLE IF NOT EXISTS journal_connexions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  telephone TEXT,
  succes BOOLEAN NOT NULL,
  details TEXT,
  date TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_connexions_tel ON journal_connexions(telephone, date);
ALTER TABLE journal_connexions DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.journal_connexions TO anon, authenticated;

-- ============= AUTHENTIFICATION =============

-- Vérifie un mot de passe : bcrypt, ou ancien format en clair (migré en bcrypt à la première connexion réussie)
CREATE OR REPLACE FUNCTION auth_verifier(p_user_id UUID, p_password TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash TEXT;
BEGIN
  SELECT password_hash INTO v_hash FROM users WHERE id = p_user_id;
  IF v_hash IS NULL OR p_password IS NULL THEN RETURN false; END IF;
  IF v_hash LIKE '$2%' THEN
    RETURN v_hash = crypt(p_password, v_hash);
  END IF;
  IF v_hash = p_password THEN
    UPDATE users SET password_hash = crypt(p_password, gen_salt('bf')) WHERE id = p_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION auth_login(p_telephone TEXT, p_password TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_user users%ROWTYPE;
  v_echecs INTEGER;
BEGIN
  SELECT count(*) INTO v_echecs FROM journal_connexions
  WHERE telephone = p_telephone AND succes = false AND date > NOW() - INTERVAL '15 minutes'
    AND date > COALESCE((SELECT max(date) FROM journal_connexions WHERE telephone = p_telephone AND succes = true), '-infinity');
  IF v_echecs >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trop de tentatives. Réessayez dans 15 minutes.');
  END IF;

  SELECT * INTO v_user FROM users WHERE telephone = p_telephone AND actif = true;
  IF NOT FOUND THEN
    INSERT INTO journal_connexions (telephone, succes, details) VALUES (p_telephone, false, 'compte inconnu ou inactif');
    RETURN jsonb_build_object('ok', false, 'error', 'Numéro de téléphone non reconnu ou compte inactif');
  END IF;

  IF NOT auth_verifier(v_user.id, p_password) THEN
    INSERT INTO journal_connexions (user_id, telephone, succes, details) VALUES (v_user.id, p_telephone, false, 'mot de passe incorrect');
    RETURN jsonb_build_object('ok', false, 'error', 'Mot de passe incorrect');
  END IF;

  INSERT INTO journal_connexions (user_id, telephone, succes) VALUES (v_user.id, p_telephone, true);
  RETURN jsonb_build_object('ok', true, 'user', to_jsonb(v_user) - 'password_hash');
END;
$$;

CREATE OR REPLACE FUNCTION auth_changer_mot_de_passe(p_user_id UUID, p_ancien TEXT, p_nouveau TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT auth_verifier(p_user_id, p_ancien) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Mot de passe actuel incorrect');
  END IF;
  IF p_nouveau IS NULL OR length(p_nouveau) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
  END IF;
  IF p_nouveau = p_ancien THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Le nouveau mot de passe doit être différent de l’ancien');
  END IF;
  UPDATE users SET password_hash = crypt(p_nouveau, gen_salt('bf')), first_login = false, password_changed = true WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Création de compte / réinitialisation par le bureau
CREATE OR REPLACE FUNCTION auth_definir_mot_de_passe(p_user_id UUID, p_nouveau TEXT, p_reinit BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_nouveau IS NULL OR length(p_nouveau) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Le mot de passe doit contenir au moins 8 caractères');
  END IF;
  UPDATE users SET password_hash = crypt(p_nouveau, gen_salt('bf')),
    first_login = p_reinit OR first_login,
    password_changed = CASE WHEN p_reinit THEN false ELSE password_changed END
  WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Modification de son propre profil (téléphone, email)
CREATE OR REPLACE FUNCTION profil_modifier(p_user_id UUID, p_telephone TEXT, p_email TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_user users%ROWTYPE;
BEGIN
  IF p_telephone IS NULL OR length(trim(p_telephone)) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Numéro de téléphone invalide');
  END IF;
  IF p_email IS NOT NULL AND p_email <> '' AND p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Adresse email invalide');
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE telephone = trim(p_telephone) AND id <> p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ce numéro est déjà utilisé par un autre membre');
  END IF;
  UPDATE users SET telephone = trim(p_telephone), email = NULLIF(trim(p_email), '') WHERE id = p_user_id RETURNING * INTO v_user;
  RETURN jsonb_build_object('ok', true, 'user', to_jsonb(v_user) - 'password_hash');
END;
$$;

GRANT EXECUTE ON FUNCTION auth_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth_changer_mot_de_passe(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth_definir_mot_de_passe(UUID, TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION profil_modifier(UUID, TEXT, TEXT) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION auth_verifier(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ============= SITUATION D'UN MEMBRE =============

-- Mouvements validés d'un membre, avec la catégorie déduite du type si elle est absente
CREATE OR REPLACE FUNCTION mouvements_membre_valides(p_membre_id UUID)
RETURNS TABLE (caisse_id UUID, montant NUMERIC, categorie TEXT, type TEXT, date TIMESTAMP)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mv.caisse_id, mv.montant,
         COALESCE(mv.categorie, CASE WHEN mv.type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet') THEN 'entree' ELSE 'sortie' END)::TEXT,
         mv.type::TEXT, mv.date::TIMESTAMP
  FROM mouvements mv
  WHERE mv.membre_id = p_membre_id AND mv.statut = 'valide';
$$;

CREATE OR REPLACE FUNCTION situation_membre(p_membre_id UUID, p_exercice_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_ex exercices%ROWTYPE;
  v_debut TIMESTAMP;
  v_fin TIMESTAMP;
  v_caisses JSONB;
  v_prets JSONB;
  v_presence JSONB;
  v_amendes NUMERIC;
  v_interets NUMERIC;
BEGIN
  IF p_exercice_id IS NOT NULL THEN
    SELECT * INTO v_ex FROM exercices WHERE id = p_exercice_id;
  ELSE
    SELECT * INTO v_ex FROM exercices WHERE statut = 'ouvert' ORDER BY annee DESC LIMIT 1;
  END IF;
  v_debut := COALESCE(v_ex.date_ouverture, date_trunc('year', NOW()));
  v_fin := COALESCE(v_ex.date_cloture, NOW());

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'caisse_id', c.id,
    'nom', c.nom,
    'type', c.type,
    'montant_annuel', c.montant_annuel,
    'verse_exercice', COALESCE((SELECT sum(m.montant) FROM mouvements_membre_valides(p_membre_id) m WHERE m.caisse_id = c.id AND m.categorie = 'entree' AND m.date BETWEEN v_debut AND v_fin), 0),
    'reste_a_payer', CASE WHEN COALESCE(c.montant_annuel, 0) > 0
        THEN GREATEST(c.montant_annuel - COALESCE((SELECT sum(m.montant) FROM mouvements_membre_valides(p_membre_id) m WHERE m.caisse_id = c.id AND m.categorie = 'entree' AND m.date BETWEEN v_debut AND v_fin), 0), 0)
        ELSE NULL END,
    'solde_membre', COALESCE((SELECT sum(CASE WHEN m.categorie = 'entree' THEN m.montant ELSE -m.montant END) FROM mouvements_membre_valides(p_membre_id) m WHERE m.caisse_id = c.id), 0)
  ) ORDER BY c.type), '[]'::jsonb)
  INTO v_caisses
  FROM caisses c
  WHERE c.actif = true AND c.type IN ('cassation', 'charite', 'secours', 'epargne', 'scolaire');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'montant', p.montant, 'montant_restant', p.montant_restant, 'taux_interet', p.taux_interet,
    'date_echeance', p.date_echeance, 'statut', p.statut, 'motif', p.motif,
    'en_retard', p.date_echeance < NOW() AND p.montant_restant > 0
  ) ORDER BY p.date_echeance), '[]'::jsonb)
  INTO v_prets
  FROM prets p WHERE p.membre_id = p_membre_id AND p.statut IN ('approuve', 'en_cours');

  SELECT jsonb_build_object(
    'reunions', count(*),
    'presences', count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.presences) e WHERE e->>'membreId' = p_membre_id::text AND (e->>'present')::boolean)),
    'retards', count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.presences) e WHERE e->>'membreId' = p_membre_id::text AND COALESCE((e->>'retard')::boolean, false)))
  ) INTO v_presence
  FROM reunions r WHERE r.statut = 'terminee' AND r.date BETWEEN v_debut AND v_fin
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.presences) e WHERE e->>'membreId' = p_membre_id::text);

  SELECT COALESCE(sum(montant), 0) INTO v_amendes FROM mouvements_membre_valides(p_membre_id) WHERE type = 'penalite' AND date BETWEEN v_debut AND v_fin;

  SELECT COALESCE(sum(l.montant), 0) INTO v_interets
  FROM distributions_interets_lignes l JOIN distributions_interets d ON d.id = l.distribution_id
  WHERE l.membre_id = p_membre_id AND d.statut = 'executee';

  RETURN jsonb_build_object(
    'exercice', jsonb_build_object('id', v_ex.id, 'annee', v_ex.annee, 'debut', v_debut, 'fin', v_fin),
    'caisses', v_caisses,
    'prets', v_prets,
    'total_pret_restant', COALESCE((SELECT sum((x->>'montant_restant')::numeric) FROM jsonb_array_elements(v_prets) x), 0),
    'presence', COALESCE(v_presence, jsonb_build_object('reunions', 0, 'presences', 0, 'retards', 0)),
    'amendes_exercice', v_amendes,
    'interets_recus', v_interets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION situation_membre(UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION mouvements_membre_valides(UUID) FROM PUBLIC, anon, authenticated;

-- ============= NOTIFICATIONS AUTOMATIQUES =============

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS page TEXT;   -- page de l'application à ouvrir au clic

CREATE OR REPLACE FUNCTION trg_notif_mouvement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID;
BEGIN
  IF OLD.statut = 'en_attente' AND NEW.statut IN ('valide', 'rejete') THEN
    FOR v_uid IN
      SELECT DISTINCT x FROM unnest(ARRAY[NEW.membre_id, (to_jsonb(NEW)->>'cree_par')::uuid]) AS x WHERE x IS NOT NULL
    LOOP
      INSERT INTO notifications (user_id, titre, message, type, page)
      VALUES (v_uid,
        CASE WHEN NEW.statut = 'valide' THEN 'Mouvement validé' ELSE 'Mouvement rejeté' END,
        COALESCE(NEW.description, NEW.type) || ' - ' || NEW.montant::bigint || ' FCFA',
        'mouvement', 'mouvements');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notif_mouvement ON mouvements;
CREATE TRIGGER notif_mouvement AFTER UPDATE OF statut ON mouvements FOR EACH ROW EXECUTE FUNCTION trg_notif_mouvement();

CREATE OR REPLACE FUNCTION trg_notif_pret() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut AND NEW.statut IN ('approuve', 'rejete') THEN
    INSERT INTO notifications (user_id, titre, message, type, page)
    VALUES (NEW.membre_id,
      CASE WHEN NEW.statut = 'approuve' THEN 'Prêt approuvé' ELSE 'Prêt refusé' END,
      'Votre demande de ' || NEW.montant::bigint || ' FCFA (' || COALESCE(NEW.motif, '') || ')',
      'pret', 'loans');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notif_pret ON prets;
CREATE TRIGGER notif_pret AFTER UPDATE OF statut ON prets FOR EACH ROW EXECUTE FUNCTION trg_notif_pret();

CREATE OR REPLACE FUNCTION trg_notif_tontine() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM 'en_cours' AND NEW.statut = 'en_cours' THEN
    INSERT INTO notifications (user_id, titre, message, type, page)
    SELECT p.membre_id, 'Tontine démarrée', NEW.nom || ' : l''ordre de passage est fixé, consultez votre tour.', 'tontine', 'tontine'
    FROM tontine_participants p WHERE p.tontine_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notif_tontine ON tontines;
CREATE TRIGGER notif_tontine AFTER UPDATE OF statut ON tontines FOR EACH ROW EXECUTE FUNCTION trg_notif_tontine();

CREATE OR REPLACE FUNCTION trg_notif_tour() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    IF NEW.statut = 'verse' THEN
      INSERT INTO notifications (user_id, titre, message, type, page)
      VALUES (NEW.membre_id, 'Tontine : pot versé', 'Le pot du tour ' || NEW.numero || ' (' || NEW.montant_attendu::bigint || ' FCFA) vous a été versé.', 'tontine', 'tontine');
    ELSIF NEW.statut = 'en_cours' AND OLD.statut = 'a_venir' THEN
      INSERT INTO notifications (user_id, titre, message, type, page)
      SELECT DISTINCT c.membre_id, 'Tontine : nouveau tour', 'Tour ' || NEW.numero || ' ouvert, votre mise est attendue.', 'tontine', 'tontine'
      FROM tontine_cotisations c WHERE c.tour_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notif_tour ON tontine_tours;
CREATE TRIGGER notif_tour AFTER UPDATE OF statut ON tontine_tours FOR EACH ROW EXECUTE FUNCTION trg_notif_tour();

CREATE OR REPLACE FUNCTION trg_notif_distribution_interets() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM 'executee' AND NEW.statut = 'executee' THEN
    INSERT INTO notifications (user_id, titre, message, type, page)
    SELECT l.membre_id, 'Intérêts reçus', 'Vous avez reçu ' || l.montant::bigint || ' FCFA sur votre épargne.', 'distribution', 'myspace'
    FROM distributions_interets_lignes l WHERE l.distribution_id = NEW.id AND l.montant > 0;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notif_distribution_interets ON distributions_interets;
CREATE TRIGGER notif_distribution_interets AFTER UPDATE OF statut ON distributions_interets FOR EACH ROW EXECUTE FUNCTION trg_notif_distribution_interets();

-- ============= DURCISSEMENT (optionnel, après vérification) =============
-- Empêche la lecture des mots de passe depuis le navigateur. À exécuter une fois
-- l'application mise à jour (elle ne lit plus password_hash) :
--
-- REVOKE SELECT ON public.users FROM anon, authenticated;
-- GRANT SELECT (id, nom, prenom, telephone, email, role, actif, date_inscription, rang_tontine, first_login, password_changed)
--   ON public.users TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Module Mon espace migré' as status;
