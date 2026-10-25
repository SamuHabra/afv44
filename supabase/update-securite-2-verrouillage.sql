-- ============================================
-- 🔒 SÉCURITÉ — ÉTAPE 2/2 : VERROUILLAGE DE LA BASE
-- ============================================
-- ⚠️ NE LANCER QU'APRÈS avoir vérifié, dans l'application, que le test
--    « Paramètres → Sécurité » affiche « Jeton accepté ✅ ».
--
-- Effet :
--   • le public (clé anon) n'a plus AUCUN accès aux tables ni aux fonctions, sauf la connexion ;
--   • chaque requête doit porter le jeton signé à la connexion ;
--   • chaque table a des règles par rôle (RLS) ;
--   • les fonctions sensibles vérifient que l'appelante est bien celle qu'elle prétend être ;
--   • le hash des mots de passe n'est plus lisible par personne.
--
-- En cas de problème : exécuter update-securite-rollback.sql (rétablit l'ancien état).
-- Idempotent : peut être relancé.
-- ============================================

-- ───── 0. Précondition ─────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.secrets WHERE nom = 'jwt_secret' AND valeur NOT LIKE 'COLLER%') THEN
    RAISE EXCEPTION 'Étape 1 non terminée : le secret JWT n''est pas configuré (update-securite-1-jeton.sql).';
  END IF;
END $$;

-- ───── 1. Gardes réutilisables ─────
CREATE OR REPLACE FUNCTION exiger_identite(p_id UUID) RETURNS VOID
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF app_uid() IS NULL OR app_uid() IS DISTINCT FROM p_id THEN
    RAISE EXCEPTION 'Accès refusé : identité non conforme' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION exiger_role(VARIADIC p_roles TEXT[]) RETURNS VOID
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT (app_role() = ANY(p_roles)) THEN
    RAISE EXCEPTION 'Accès refusé : droits insuffisants' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION exiger_soi_ou_bureau(p_id UUID) RETURNS VOID
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF app_uid() IS DISTINCT FROM p_id AND NOT (app_role() = ANY (ARRAY['admin','presidente','secretaire','tresoriere','commissaire'])) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ───── 2. Gardes injectées dans les fonctions existantes ─────
DO $$
DECLARE r RECORD; def TEXT; neuf TEXT;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, x.garde
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    JOIN (VALUES
      ('cloturer_exercice',         'PERFORM exiger_identite(p_user_id);'),
      ('ouvrir_exercice',           'PERFORM exiger_identite(p_user_id);'),
      ('rouvrir_exercice',          'PERFORM exiger_identite(p_user_id);'),
      ('modifier_parametres',       'PERFORM exiger_identite(p_user_id);'),
      ('modifier_bareme_amende',    'PERFORM exiger_identite(p_user_id);'),
      ('modifier_role',             'PERFORM exiger_identite(p_admin_id);'),
      -- p_user peut être NULL quand l'archivage est déclenché par la clôture : on exige alors le rôle seulement
      ('archiver_rapport',          'PERFORM exiger_role(''admin'',''presidente'',''tresoriere''); IF p_user IS NOT NULL THEN PERFORM exiger_identite(p_user); END IF;'),
      ('auth_changer_mot_de_passe', 'PERFORM exiger_identite(p_user_id);'),
      ('profil_modifier',           'PERFORM exiger_identite(p_user_id);'),
      ('auth_definir_mot_de_passe', 'PERFORM exiger_role(''admin'');'),
      ('situation_membre',          'PERFORM exiger_soi_ou_bureau(p_membre_id);'),
      ('valider_mouvement',         'PERFORM exiger_identite(p_valide_par); PERFORM exiger_role(''admin'',''presidente'',''commissaire'');'),
      ('rejeter_mouvement',         'PERFORM exiger_identite(p_rejete_par); PERFORM exiger_role(''admin'',''presidente'',''commissaire'');'),
      ('repartir_interets',         'PERFORM exiger_role(''admin'',''presidente'',''tresoriere'');'),
      ('recalculer_solde_caisse',   'PERFORM exiger_role(''admin'');'),
      ('rapport_financier',         'PERFORM exiger_role(''admin'',''presidente'',''secretaire'',''tresoriere'',''commissaire'',''animatrice'',''conseillere'');'),
      ('rapport_cotisations',       'PERFORM exiger_role(''admin'',''presidente'',''secretaire'',''tresoriere'',''commissaire'',''animatrice'',''conseillere'');'),
      ('rapport_prets',             'PERFORM exiger_role(''admin'',''presidente'',''secretaire'',''tresoriere'',''commissaire'',''animatrice'',''conseillere'');'),
      ('rapport_reunions',          'PERFORM exiger_role(''admin'',''presidente'',''secretaire'',''tresoriere'',''commissaire'',''animatrice'',''conseillere'');')
    ) AS x(nom, garde) ON x.nom = p.proname
  LOOP
    def := pg_get_functiondef(r.oid);
    IF def LIKE '%exiger\_%' THEN CONTINUE; END IF;                       -- déjà protégée
    -- première occurrence du mot BEGIN uniquement
    neuf := regexp_replace(def, E'\\mBEGIN\\M', 'BEGIN ' || r.garde, 'i');
    IF neuf = def THEN
      RAISE WARNING 'Garde non injectée dans % (pas de bloc BEGIN) : à protéger à la main', r.proname;
    ELSE
      EXECUTE neuf;
    END IF;
  END LOOP;
END $$;

-- Les fonctions de déclenchement (triggers) s'exécutent avec les droits du propriétaire :
-- elles doivent pouvoir écrire (notifications, archives, journaux) quelle que soit l'appelante.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname LIKE 'trg\_%'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public, extensions', r.oid::regprocedure);
  END LOOP;
END $$;

-- ───── 3. Protection des colonnes sensibles de « users » ─────
-- (rôle et mot de passe ne se modifient que par les fonctions dédiées)
CREATE OR REPLACE FUNCTION trg_users_protege() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
       OR NEW.password_changed IS DISTINCT FROM OLD.password_changed THEN
      RAISE EXCEPTION 'Modification du rôle ou du mot de passe : utilisez les fonctions dédiées' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS users_protege ON users;
CREATE TRIGGER users_protege BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trg_users_protege();

-- ───── 4. Suppression de toutes les anciennes règles ─────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ───── 5. RLS partout, plus aucun droit pour le public ─────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;

-- ───── 6. Droits de base des connectées (les règles RLS affinent ensuite) ─────
DO $$
DECLARE t TEXT;
BEGIN
  -- lecture
  FOREACH t IN ARRAY ARRAY['caisses','mouvements','prets','remboursements','reunions','tontines','tontine_participants',
    'tontine_tours','tontine_cotisations','distributions','distributions_interets','distributions_interets_lignes','exercices',
    'exercices_soldes','parametres','types_amende','amendes_reunion','capital_temps','rapports_archives','notifications',
    'audit_log','journal_parametres','journal_connexions']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
  -- écriture
  FOREACH t IN ARRAY ARRAY['caisses','mouvements','prets','remboursements','reunions','tontines','tontine_participants',
    'tontine_tours','tontine_cotisations','distributions','distributions_interets','distributions_interets_lignes','exercices',
    'parametres','amendes_reunion','notifications']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- users : tout sauf le hash du mot de passe en lecture ; pas de modification du rôle ni du mot de passe
DO $$
DECLARE cols_lecture TEXT; cols_maj TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols_lecture
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name <> 'password_hash';
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols_maj
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name NOT IN ('id', 'password_hash', 'role', 'password_changed');
  EXECUTE format('GRANT SELECT (%s) ON public.users TO authenticated', cols_lecture);
  EXECUTE format('GRANT UPDATE (%s) ON public.users TO authenticated', cols_maj);
  GRANT INSERT ON public.users TO authenticated;
END $$;

-- ───── 7. Règles par rôle ─────
-- Bureau = admin, présidente, secrétaire, trésorière, commissaire

-- users
CREATE POLICY users_lire ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_creer ON users FOR INSERT TO authenticated WITH CHECK (a_role('admin'));
CREATE POLICY users_modifier ON users FOR UPDATE TO authenticated
  USING (a_role('admin') OR id = app_uid()) WITH CHECK (a_role('admin') OR id = app_uid());

-- Lecture ouverte aux membres connectées (transparence de l'association)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['caisses','mouvements','prets','remboursements','reunions','tontines','tontine_participants',
    'tontine_tours','tontine_cotisations','exercices','exercices_soldes','parametres','types_amende','amendes_reunion','capital_temps']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_lire', t);
    END IF;
  END LOOP;
END $$;

-- Distributions et archives : pas pour les membres ordinaires
CREATE POLICY distributions_lire ON distributions FOR SELECT TO authenticated USING (NOT a_role('membre', ''));
CREATE POLICY distributions_ecrire ON distributions FOR ALL TO authenticated
  USING (a_role('admin','presidente','tresoriere')) WITH CHECK (a_role('admin','presidente','tresoriere'));
CREATE POLICY di_lire ON distributions_interets FOR SELECT TO authenticated USING (NOT a_role('membre', ''));
CREATE POLICY di_ecrire ON distributions_interets FOR ALL TO authenticated
  USING (a_role('admin','presidente','tresoriere')) WITH CHECK (a_role('admin','presidente','tresoriere'));
CREATE POLICY dil_lire ON distributions_interets_lignes FOR SELECT TO authenticated USING (NOT a_role('membre', ''));
CREATE POLICY dil_ecrire ON distributions_interets_lignes FOR ALL TO authenticated
  USING (a_role('admin','presidente','tresoriere')) WITH CHECK (a_role('admin','presidente','tresoriere'));
CREATE POLICY archives_lire ON rapports_archives FOR SELECT TO authenticated USING (NOT a_role('membre', ''));

-- Journaux : administratrice et commissaire aux comptes
CREATE POLICY audit_lire ON audit_log FOR SELECT TO authenticated USING (a_role('admin','commissaire'));
CREATE POLICY journal_param_lire ON journal_parametres FOR SELECT TO authenticated USING (a_role('admin','commissaire'));
CREATE POLICY journal_conn_lire ON journal_connexions FOR SELECT TO authenticated USING (a_role('admin','commissaire'));

-- Caisses et mouvements
CREATE POLICY caisses_creer ON caisses FOR INSERT TO authenticated WITH CHECK (a_role('admin','presidente','tresoriere'));
CREATE POLICY caisses_modifier ON caisses FOR UPDATE TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere','commissaire'))
  WITH CHECK (a_role('admin','presidente','secretaire','tresoriere','commissaire'));
CREATE POLICY mouvements_creer ON mouvements FOR INSERT TO authenticated
  WITH CHECK (a_role('admin','presidente','secretaire','tresoriere','commissaire'));
CREATE POLICY mouvements_modifier ON mouvements FOR UPDATE TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere','commissaire'))
  WITH CHECK (a_role('admin','presidente','secretaire','tresoriere','commissaire'));
CREATE POLICY mouvements_supprimer ON mouvements FOR DELETE TO authenticated
  USING (a_role('admin','presidente','tresoriere'));

-- Prêts : toute membre peut en demander un pour elle-même ; le bureau les gère
CREATE POLICY prets_demander ON prets FOR INSERT TO authenticated
  WITH CHECK (membre_id = app_uid() OR a_role('admin','presidente','tresoriere'));
CREATE POLICY prets_modifier ON prets FOR UPDATE TO authenticated
  USING (a_role('admin','presidente','tresoriere')) WITH CHECK (a_role('admin','presidente','tresoriere'));
CREATE POLICY remboursements_creer ON remboursements FOR INSERT TO authenticated
  WITH CHECK (a_role('admin','presidente','tresoriere'));

-- Réunions, tontines
CREATE POLICY reunions_ecrire ON reunions FOR ALL TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere')) WITH CHECK (a_role('admin','presidente','secretaire','tresoriere'));
CREATE POLICY amendes_creer ON amendes_reunion FOR INSERT TO authenticated
  WITH CHECK (a_role('admin','presidente','secretaire','tresoriere'));
CREATE POLICY tontines_ecrire ON tontines FOR ALL TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere')) WITH CHECK (a_role('admin','presidente','secretaire','tresoriere'));
CREATE POLICY tours_ecrire ON tontine_tours FOR ALL TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere')) WITH CHECK (a_role('admin','presidente','secretaire','tresoriere'));
CREATE POLICY cotisations_ecrire ON tontine_cotisations FOR ALL TO authenticated
  USING (a_role('admin','presidente','secretaire','tresoriere')) WITH CHECK (a_role('admin','presidente','secretaire','tresoriere'));
-- Une membre gère sa propre inscription ; le bureau gère toutes les inscriptions
CREATE POLICY participants_ecrire ON tontine_participants FOR ALL TO authenticated
  USING (membre_id = app_uid() OR a_role('admin','presidente','secretaire','tresoriere'))
  WITH CHECK (membre_id = app_uid() OR a_role('admin','presidente','secretaire','tresoriere'));

-- Exercice et paramètres : administratrice
CREATE POLICY exercices_ecrire ON exercices FOR ALL TO authenticated USING (a_role('admin')) WITH CHECK (a_role('admin'));
CREATE POLICY parametres_ecrire ON parametres FOR ALL TO authenticated USING (a_role('admin')) WITH CHECK (a_role('admin'));

-- Notifications : chacune lit et marque les siennes ; tout le monde peut en émettre
CREATE POLICY notif_lire ON notifications FOR SELECT TO authenticated USING (user_id = app_uid() OR a_role('admin'));
CREATE POLICY notif_creer ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY notif_modifier ON notifications FOR UPDATE TO authenticated USING (user_id = app_uid()) WITH CHECK (user_id = app_uid());

-- ───── 8. Fonctions : seule la connexion reste publique ─────
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION auth_login(TEXT, TEXT) TO anon, authenticated;
-- Fonctions internes : jamais appelables depuis l'extérieur
REVOKE EXECUTE ON FUNCTION auth_verifier(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION journaliser(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION mouvements_membre_valides(UUID) FROM PUBLIC, anon, authenticated;

-- Les futures tables et fonctions ne seront pas ouvertes au public par défaut
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

-- ───── 9. Contrôle ─────
SELECT 'Tables sans RLS' AS controle, count(*) AS nombre FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity
UNION ALL
SELECT 'Tables lisibles par anon', count(DISTINCT table_name) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND grantee = 'anon'
UNION ALL
SELECT 'Politiques créées', count(*) FROM pg_policies WHERE schemaname = 'public';
-- Attendu : 0, 0, puis le nombre de politiques.
