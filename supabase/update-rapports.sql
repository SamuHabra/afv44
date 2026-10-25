-- ============================================
-- 📊 MODULE RAPPORTS - MIGRATION BACKEND
-- ============================================
-- Rapports calculés en base sur une période, contrôle de cohérence des caisses,
-- archivage figé des rapports officiels (automatique à la clôture d'un exercice)
-- Prérequis : update-reunions.sql, update-tontine.sql, update-distribution-interets.sql
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

-- Mouvements validés avec la catégorie déduite du type si elle est absente
CREATE OR REPLACE VIEW v_mouvements_valides AS
SELECT m.id, m.caisse_id, m.membre_id, m.type::TEXT AS type, m.montant::NUMERIC AS montant,
       COALESCE(m.categorie, CASE WHEN m.type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet') THEN 'entree' ELSE 'sortie' END)::TEXT AS categorie,
       m.date::TIMESTAMP AS date
FROM mouvements m
WHERE m.statut = 'valide';

-- ============= 1. RAPPORT FINANCIER =============
CREATE OR REPLACE FUNCTION rapport_financier(p_debut DATE, p_fin DATE) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_debut TIMESTAMP := p_debut::TIMESTAMP;
  v_fin TIMESTAMP := (p_fin + 1)::TIMESTAMP;   -- borne exclusive
  v_caisses JSONB;
  v_types JSONB;
  v_mensuel JSONB;
BEGIN
  WITH agg AS (
    SELECT c.id AS caisse_id, c.nom, c.type,
      COALESCE(SUM(CASE WHEN v.date < v_debut THEN CASE WHEN v.categorie = 'entree' THEN v.montant ELSE -v.montant END END), 0) AS solde_ouverture,
      COALESCE(SUM(CASE WHEN v.date >= v_debut AND v.date < v_fin AND v.categorie = 'entree' THEN v.montant END), 0) AS entrees,
      COALESCE(SUM(CASE WHEN v.date >= v_debut AND v.date < v_fin AND v.categorie = 'sortie' THEN v.montant END), 0) AS sorties
    FROM caisses c LEFT JOIN v_mouvements_valides v ON v.caisse_id = c.id
    WHERE c.actif = true
    GROUP BY c.id, c.nom, c.type
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(a) || jsonb_build_object('solde_cloture', a.solde_ouverture + a.entrees - a.sorties) ORDER BY a.nom), '[]'::jsonb)
  INTO v_caisses FROM agg a;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('type', t.type, 'categorie', t.categorie, 'total', t.total, 'nb', t.nb) ORDER BY t.categorie, t.total DESC), '[]'::jsonb)
  INTO v_types
  FROM (
    SELECT v.type, v.categorie, SUM(v.montant) AS total, COUNT(*) AS nb
    FROM v_mouvements_valides v WHERE v.date >= v_debut AND v.date < v_fin
    GROUP BY v.type, v.categorie
  ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'mois', to_char(m.mois, 'YYYY-MM'),
    'entrees', COALESCE((SELECT SUM(v.montant) FROM v_mouvements_valides v WHERE v.categorie = 'entree' AND v.date >= GREATEST(m.mois, v_debut) AND v.date < LEAST(m.mois + INTERVAL '1 month', v_fin)), 0),
    'sorties', COALESCE((SELECT SUM(v.montant) FROM v_mouvements_valides v WHERE v.categorie = 'sortie' AND v.date >= GREATEST(m.mois, v_debut) AND v.date < LEAST(m.mois + INTERVAL '1 month', v_fin)), 0),
    'solde_fin', COALESCE((SELECT SUM(CASE WHEN v.categorie = 'entree' THEN v.montant ELSE -v.montant END) FROM v_mouvements_valides v WHERE v.date < LEAST(m.mois + INTERVAL '1 month', v_fin)), 0)
  ) ORDER BY m.mois), '[]'::jsonb)
  INTO v_mensuel
  FROM generate_series(date_trunc('month', v_debut), date_trunc('month', p_fin::TIMESTAMP), INTERVAL '1 month') AS m(mois);

  RETURN jsonb_build_object(
    'periode', jsonb_build_object('debut', p_debut, 'fin', p_fin),
    'caisses', v_caisses,
    'par_type', v_types,
    'mensuel', v_mensuel,
    'total_entrees', COALESCE((SELECT SUM((x->>'entrees')::NUMERIC) FROM jsonb_array_elements(v_caisses) x), 0),
    'total_sorties', COALESCE((SELECT SUM((x->>'sorties')::NUMERIC) FROM jsonb_array_elements(v_caisses) x), 0),
    'solde_ouverture', COALESCE((SELECT SUM((x->>'solde_ouverture')::NUMERIC) FROM jsonb_array_elements(v_caisses) x), 0),
    'solde_cloture', COALESCE((SELECT SUM((x->>'solde_cloture')::NUMERIC) FROM jsonb_array_elements(v_caisses) x), 0)
  );
END;
$$;

-- ============= 2. CONTRÔLE DE COHÉRENCE DES CAISSES =============
CREATE OR REPLACE FUNCTION rapport_coherence() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'caisse_id', c.id,
    'nom', c.nom,
    'type', c.type,
    'solde_enregistre', c.solde,
    'solde_calcule', COALESCE(s.total, 0),
    'ecart', c.solde - COALESCE(s.total, 0),
    'nb_en_attente', COALESCE(a.n, 0)
  ) ORDER BY c.nom), '[]'::jsonb)
  FROM caisses c
  LEFT JOIN (
    SELECT caisse_id, SUM(CASE WHEN categorie = 'entree' THEN montant ELSE -montant END) AS total
    FROM v_mouvements_valides GROUP BY caisse_id
  ) s ON s.caisse_id = c.id
  LEFT JOIN (
    SELECT caisse_id, COUNT(*) AS n FROM mouvements WHERE statut = 'en_attente' GROUP BY caisse_id
  ) a ON a.caisse_id = c.id
  WHERE c.actif = true;
$$;

-- Remet le solde enregistré d'une caisse à la somme de ses mouvements validés
CREATE OR REPLACE FUNCTION recalculer_solde_caisse(p_caisse_id UUID) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_solde NUMERIC;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN categorie = 'entree' THEN montant ELSE -montant END), 0) INTO v_solde
  FROM v_mouvements_valides WHERE caisse_id = p_caisse_id;
  UPDATE caisses SET solde = v_solde WHERE id = p_caisse_id;
  RETURN v_solde;
END;
$$;

-- ============= 3. COTISATIONS ET RETARDATAIRES =============
CREATE OR REPLACE FUNCTION rapport_cotisations(p_exercice_id UUID DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ex exercices%ROWTYPE;
  v_debut TIMESTAMP;
  v_fin TIMESTAMP;
BEGIN
  IF p_exercice_id IS NOT NULL THEN
    SELECT * INTO v_ex FROM exercices WHERE id = p_exercice_id;
  ELSE
    SELECT * INTO v_ex FROM exercices WHERE statut = 'ouvert' ORDER BY annee DESC LIMIT 1;
  END IF;
  v_debut := COALESCE(v_ex.date_ouverture, date_trunc('year', NOW()))::TIMESTAMP;
  v_fin := COALESCE(v_ex.date_cloture, NOW())::TIMESTAMP;

  RETURN jsonb_build_object(
    'exercice', jsonb_build_object('id', v_ex.id, 'annee', v_ex.annee, 'debut', v_debut, 'fin', v_fin),
    'caisses', (SELECT COALESCE(jsonb_agg(jsonb_build_object('caisse_id', c.id, 'nom', c.nom, 'montant_annuel', c.montant_annuel) ORDER BY c.type), '[]'::jsonb)
                FROM caisses c WHERE c.actif = true AND COALESCE(c.montant_annuel, 0) > 0),
    'membres', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'membre_id', u.id,
        'nom', u.prenom || ' ' || u.nom,
        'versements', (SELECT COALESCE(jsonb_object_agg(c.id::TEXT, COALESCE((
            SELECT SUM(v.montant) FROM v_mouvements_valides v
            WHERE v.membre_id = u.id AND v.caisse_id = c.id AND v.categorie = 'entree' AND v.date BETWEEN v_debut AND v_fin), 0)), '{}'::jsonb)
          FROM caisses c WHERE c.actif = true AND COALESCE(c.montant_annuel, 0) > 0)
      ) ORDER BY u.nom), '[]'::jsonb)
      FROM users u WHERE u.actif = true)
  );
END;
$$;

-- ============= 4. PRÊTS =============
CREATE OR REPLACE FUNCTION rapport_prets(p_debut DATE, p_fin DATE) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_details JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'membre', u.prenom || ' ' || u.nom,
    'motif', p.motif,
    'montant', p.montant,
    'montant_restant', p.montant_restant,
    'taux_interet', p.taux_interet,
    'date_demande', p.date_demande,
    'date_echeance', p.date_echeance,
    'statut', p.statut,
    'rembourse', COALESCE((SELECT SUM(r.montant) FROM remboursements r WHERE r.pret_id = p.id), 0),
    'interets_generes', p.interets_generes,
    'en_retard', p.statut IN ('approuve', 'en_cours') AND p.date_echeance < NOW() AND p.montant_restant > 0
  ) ORDER BY p.date_demande DESC), '[]'::jsonb)
  INTO v_details
  FROM prets p JOIN users u ON u.id = p.membre_id
  WHERE p.date_demande >= p_debut::TIMESTAMP AND p.date_demande < (p_fin + 1)::TIMESTAMP;

  RETURN jsonb_build_object(
    'periode', jsonb_build_object('debut', p_debut, 'fin', p_fin),
    'details', v_details,
    'nb', (SELECT COUNT(*) FROM jsonb_array_elements(v_details) x WHERE x->>'statut' <> 'rejete' AND x->>'statut' <> 'en_attente'),
    'total_prete', COALESCE((SELECT SUM((x->>'montant')::NUMERIC) FROM jsonb_array_elements(v_details) x WHERE x->>'statut' IN ('approuve', 'en_cours', 'rembourse')), 0),
    'total_rembourse', COALESCE((SELECT SUM((x->>'rembourse')::NUMERIC) FROM jsonb_array_elements(v_details) x WHERE x->>'statut' IN ('approuve', 'en_cours', 'rembourse')), 0),
    'interets_percus', COALESCE((SELECT SUM((x->>'interets_generes')::NUMERIC) FROM jsonb_array_elements(v_details) x WHERE x->>'statut' IN ('approuve', 'en_cours', 'rembourse')), 0),
    'encours', COALESCE((SELECT SUM(montant_restant) FROM prets WHERE statut IN ('approuve', 'en_cours')), 0),
    'nb_en_retard', (SELECT COUNT(*) FROM prets WHERE statut IN ('approuve', 'en_cours') AND date_echeance < NOW() AND montant_restant > 0),
    'montant_en_retard', COALESCE((SELECT SUM(montant_restant) FROM prets WHERE statut IN ('approuve', 'en_cours') AND date_echeance < NOW() AND montant_restant > 0), 0)
  );
END;
$$;

-- ============= 5. RÉUNIONS ET ASSIDUITÉ =============
CREATE OR REPLACE FUNCTION rapport_reunions(p_debut DATE, p_fin DATE) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_debut TIMESTAMP := p_debut::TIMESTAMP;
  v_fin TIMESTAMP := (p_fin + 1)::TIMESTAMP;
BEGIN
  RETURN jsonb_build_object(
    'periode', jsonb_build_object('debut', p_debut, 'fin', p_fin),
    'reunions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id, 'titre', r.titre, 'date', r.date, 'lieu', r.lieu, 'statut', r.statut,
        'presents', (SELECT COUNT(*) FROM jsonb_array_elements(r.presences) e WHERE COALESCE((e->>'present')::BOOLEAN, false)),
        'absents', (SELECT COUNT(*) FROM jsonb_array_elements(r.presences) e WHERE NOT COALESCE((e->>'present')::BOOLEAN, false)),
        'retards', (SELECT COUNT(*) FROM jsonb_array_elements(r.presences) e WHERE COALESCE((e->>'retard')::BOOLEAN, false)),
        'total_cotisations', COALESCE(r.total_cotisations, 0),
        'total_amendes', COALESCE(r.total_amendes, 0),
        'total_depenses', COALESCE(r.total_depenses, 0),
        'nb_decisions', COALESCE(array_length(r.decisions, 1), 0),
        'statut_pv', COALESCE(r.statut_pv, 'non_redige')
      ) ORDER BY r.date DESC), '[]'::jsonb)
      FROM reunions r WHERE r.statut IN ('terminee', 'en_cours') AND r.date >= v_debut AND r.date < v_fin),
    'membres', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'membre_id', s.membre_id, 'nom', s.nom, 'reunions', s.reunions, 'presences', s.presences, 'retards', s.retards
      ) ORDER BY s.nom), '[]'::jsonb)
      FROM (
        SELECT u.id AS membre_id, u.prenom || ' ' || u.nom AS nom,
          COUNT(r.id) AS reunions,
          COUNT(r.id) FILTER (WHERE COALESCE((e.p->>'present')::BOOLEAN, false)) AS presences,
          COUNT(r.id) FILTER (WHERE COALESCE((e.p->>'retard')::BOOLEAN, false)) AS retards
        FROM users u
        LEFT JOIN reunions r ON r.statut = 'terminee' AND r.date >= v_debut AND r.date < v_fin
        LEFT JOIN LATERAL (
          SELECT x AS p FROM jsonb_array_elements(r.presences) x WHERE x->>'membreId' = u.id::TEXT LIMIT 1
        ) e ON true
        WHERE u.actif = true AND (r.id IS NULL OR e.p IS NOT NULL)
        GROUP BY u.id, u.prenom, u.nom
      ) s)
  );
END;
$$;

-- ============= 6. TONTINES =============
CREATE OR REPLACE FUNCTION rapport_tontines() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'nom', t.nom,
    'statut', t.statut,
    'mise', t.montant_par_rang,
    'nb_participants', (SELECT COUNT(*) FROM tontine_participants p WHERE p.tontine_id = t.id),
    'nb_parts', COALESCE((SELECT SUM(p.nb_parts) FROM tontine_participants p WHERE p.tontine_id = t.id), 0),
    'tours_total', (SELECT COUNT(*) FROM tontine_tours r WHERE r.tontine_id = t.id),
    'tours_verses', (SELECT COUNT(*) FROM tontine_tours r WHERE r.tontine_id = t.id AND r.statut = 'verse'),
    'total_verse', COALESCE((SELECT SUM(r.montant_verse) FROM tontine_tours r WHERE r.tontine_id = t.id), 0),
    'solde_jeu', COALESCE((SELECT SUM(CASE WHEN m.type = 'cotisation' THEN m.montant ELSE -m.montant END)
                           FROM mouvements m WHERE m.tontine_id = t.id AND m.statut = 'valide' AND m.type IN ('cotisation', 'distribution')), 0),
    'mises_en_retard', (SELECT COUNT(*) FROM tontine_cotisations c JOIN tontine_tours r ON r.id = c.tour_id
                        WHERE r.tontine_id = t.id AND c.statut = 'en_retard')
  ) ORDER BY t.date_debut DESC), '[]'::jsonb)
  FROM tontines t WHERE t.statut <> 'annulee';
$$;

-- ============= 7. ARCHIVES (rapports officiels figés) =============
CREATE TABLE IF NOT EXISTS rapports_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('financier', 'cotisations', 'prets', 'reunions', 'tontines')),
  titre TEXT NOT NULL,
  periode_debut DATE,
  periode_fin DATE,
  contenu JSONB NOT NULL,
  cree_par UUID REFERENCES users(id),
  date_creation TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rapports_archives_type ON rapports_archives(type, date_creation DESC);
ALTER TABLE rapports_archives DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rapports_archives TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rapports_archives FROM anon, authenticated;

-- Un rapport archivé ne se modifie ni ne se supprime
CREATE OR REPLACE FUNCTION trg_rapports_archives_immuable() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Un rapport archivé ne peut être ni modifié ni supprimé';
END;
$$;
DROP TRIGGER IF EXISTS rapports_archives_immuable ON rapports_archives;
CREATE TRIGGER rapports_archives_immuable BEFORE UPDATE OR DELETE ON rapports_archives
  FOR EACH ROW EXECUTE FUNCTION trg_rapports_archives_immuable();

-- Génère le rapport côté serveur puis le fige (le contenu ne vient jamais du navigateur)
CREATE OR REPLACE FUNCTION archiver_rapport(p_type TEXT, p_titre TEXT, p_debut DATE, p_fin DATE, p_user UUID, p_exercice_id UUID DEFAULT NULL) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_contenu JSONB;
  v_id UUID;
BEGIN
  v_contenu := CASE p_type
    WHEN 'financier' THEN rapport_financier(p_debut, p_fin) || jsonb_build_object('coherence', rapport_coherence())
    WHEN 'cotisations' THEN rapport_cotisations(p_exercice_id)
    WHEN 'prets' THEN rapport_prets(p_debut, p_fin)
    WHEN 'reunions' THEN rapport_reunions(p_debut, p_fin)
    WHEN 'tontines' THEN rapport_tontines()
    ELSE NULL END;
  IF v_contenu IS NULL THEN RAISE EXCEPTION 'Type de rapport inconnu : %', p_type; END IF;

  INSERT INTO rapports_archives (type, titre, periode_debut, periode_fin, contenu, cree_par)
  VALUES (p_type, p_titre, p_debut, p_fin, v_contenu, p_user) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Archivage automatique du rapport financier à la clôture d'un exercice
CREATE OR REPLACE FUNCTION trg_archiver_cloture_exercice() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.statut IS DISTINCT FROM 'cloture' AND NEW.statut = 'cloture' THEN
    PERFORM archiver_rapport('financier', 'Rapport de clôture - exercice ' || NEW.annee,
      NEW.date_ouverture::DATE, COALESCE(NEW.date_cloture, NOW())::DATE, NULL);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS archiver_cloture_exercice ON exercices;
CREATE TRIGGER archiver_cloture_exercice AFTER UPDATE OF statut ON exercices
  FOR EACH ROW EXECUTE FUNCTION trg_archiver_cloture_exercice();

-- ============= DROITS =============
GRANT EXECUTE ON FUNCTION rapport_financier(DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rapport_coherence() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculer_solde_caisse(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rapport_cotisations(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rapport_prets(DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rapport_reunions(DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rapport_tontines() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION archiver_rapport(TEXT, TEXT, DATE, DATE, UUID, UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Module rapports migré' as status;
