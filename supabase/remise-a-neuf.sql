-- ============================================================
-- REMISE À NEUF : efface les données de test, garde la configuration
-- ============================================================
-- À exécuter dans Supabase → SQL Editor. IRRÉVERSIBLE : faites d'abord une sauvegarde
-- (Database → Backups, ou export des tables) et NE LA LANCEZ PAS sur une base déjà en usage réel.
--
-- ÉFFACÉ  : mouvements, prêts, remboursements, réunions (présences, amendes, PV), tontines, distributions
--           d'intérêts, exercices et leurs soldes, rapports archivés, notifications, journaux
--           (connexions, paramètres, audit).
--           TOUS les comptes membres.
-- GARDÉ   : caisses (soldes remis à 0), paramètres, barème des amendes, secret de sécurité (private.secrets).
-- CRÉÉ    : un seul compte administrateur (voir v_tel / v_mdp ci-dessous, à changer à la première connexion)
--           et un exercice ouvert pour l'année choisie, avec ses soldes d'ouverture à 0.
-- ============================================================

DO $$
DECLARE
  v_annee  CONSTANT INTEGER := 2026;   -- ← année du premier exercice réel
  v_tel    CONSTANT TEXT := '+237693048669';   -- ← téléphone de connexion de l'administratrice
  v_mdp    CONSTANT TEXT := 'Admin@2025';      -- ← mot de passe provisoire (changement demandé à la 1re connexion)
  v_admin  UUID;
  v_ex     UUID;
  v_t      TEXT;
BEGIN
  -- Les rapports archivés et les exercices clôturés sont protégés par des déclencheurs : on les suspend le temps du nettoyage
  ALTER TABLE rapports_archives DISABLE TRIGGER rapports_archives_immuable;
  ALTER TABLE mouvements        DISABLE TRIGGER gel_exercice;

  -- Tables de données (celles qui n'existent pas encore sont ignorées)
  FOREACH v_t IN ARRAY ARRAY[
    'notifications', 'amendes_reunion', 'tontine_cotisations', 'tontine_tours', 'tontine_participants',
    'distributions_interets_lignes', 'remboursements', 'mouvements', 'distributions_interets', 'distributions',
    'prets', 'rangs_tontine', 'tontines', 'reunions', 'rapports_archives', 'exercices_soldes', 'exercices',
    'capital_temps', 'audit_log', 'journal_connexions', 'journal_parametres'
  ] LOOP
    IF to_regclass('public.' || v_t) IS NOT NULL THEN EXECUTE format('DELETE FROM %I', v_t); END IF;
  END LOOP;

  ALTER TABLE rapports_archives ENABLE TRIGGER rapports_archives_immuable;
  ALTER TABLE mouvements        ENABLE TRIGGER gel_exercice;

  -- Comptes : on repart d'une seule administratrice
  DELETE FROM users;
  INSERT INTO users (nom, prenom, telephone, role, actif, date_inscription, rang_tontine, password_hash, first_login, password_changed)
  VALUES ('Administratrice', 'Afmey', v_tel, 'admin', true, NOW(), 1, crypt(v_mdp, gen_salt('bf')), true, false)
  RETURNING id INTO v_admin;

  -- Caisses à zéro
  UPDATE caisses SET solde = 0;

  -- Nouvel exercice (insertion directe : ouvrir_exercice() exige un jeton de connexion, absent de l'éditeur SQL)
  INSERT INTO exercices (annee, date_ouverture, statut, ouvert_par)
  VALUES (v_annee, make_timestamp(v_annee, 1, 1, 0, 0, 0), 'ouvert', v_admin) RETURNING id INTO v_ex;
  INSERT INTO exercices_soldes (exercice_id, type, caisse_id, caisse_nom, solde)
  SELECT v_ex, 'ouverture', c.id, c.nom, c.solde FROM caisses c WHERE c.actif = true;
  PERFORM journaliser(v_admin, 'exercice_ouvert', jsonb_build_object('annee', v_annee, 'source', 'remise_a_neuf'));

  RAISE NOTICE 'Remise à neuf terminée : exercice % ouvert, % caisse(s) à 0, administratrice % créée',
    v_annee, (SELECT COUNT(*) FROM caisses), v_tel;
END $$;

-- ───── Contrôle final ─────
SELECT 'users' AS table_, COUNT(*) FROM users
UNION ALL SELECT 'caisses (solde total)', COALESCE(SUM(solde),0) FROM caisses
UNION ALL SELECT 'mouvements', COUNT(*) FROM mouvements
UNION ALL SELECT 'prets', COUNT(*) FROM prets
UNION ALL SELECT 'reunions', COUNT(*) FROM reunions
UNION ALL SELECT 'tontines', COUNT(*) FROM tontines
UNION ALL SELECT 'exercices ouverts', COUNT(*) FROM exercices WHERE statut = 'ouvert';
