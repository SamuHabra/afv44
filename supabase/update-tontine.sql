-- ============================================
-- 🎯 MODULE TONTINE - MIGRATION BACKEND
-- ============================================
-- Plusieurs jeux de tontine (mise, participants, tours) liés à la Caisse Tontine
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

-- ÉTAPE 1 : Jeux de tontine
ALTER TABLE tontines ADD COLUMN IF NOT EXISTS nb_places_max INTEGER;               -- nombre de parts maximum (NULL = illimité)
ALTER TABLE tontines ADD COLUMN IF NOT EXISTS mode_ordre TEXT DEFAULT 'tirage';

ALTER TABLE tontines DROP CONSTRAINT IF EXISTS tontines_statut_check;
ALTER TABLE tontines ADD CONSTRAINT tontines_statut_check
  CHECK (statut IN ('inscriptions', 'planifiee', 'en_cours', 'terminee', 'suspendue', 'annulee'));
ALTER TABLE tontines ALTER COLUMN statut SET DEFAULT 'inscriptions';

ALTER TABLE tontines DROP CONSTRAINT IF EXISTS tontines_mode_ordre_check;
ALTER TABLE tontines ADD CONSTRAINT tontines_mode_ordre_check CHECK (mode_ordre IN ('tirage', 'manuel'));

-- ÉTAPE 2 : Participants (un membre peut prendre plusieurs parts)
CREATE TABLE IF NOT EXISTS tontine_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tontine_id UUID NOT NULL REFERENCES tontines(id) ON DELETE CASCADE,
  membre_id UUID NOT NULL REFERENCES users(id),
  nb_parts INTEGER NOT NULL DEFAULT 1 CHECK (nb_parts >= 1),
  ordre INTEGER,
  date_inscription TIMESTAMP DEFAULT NOW(),
  UNIQUE (tontine_id, membre_id)
);

-- ÉTAPE 3 : Tours (une part = un tour = un bénéficiaire)
CREATE TABLE IF NOT EXISTS tontine_tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tontine_id UUID NOT NULL REFERENCES tontines(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  participant_id UUID NOT NULL REFERENCES tontine_participants(id) ON DELETE CASCADE,
  membre_id UUID NOT NULL REFERENCES users(id),
  date_prevue TIMESTAMP NOT NULL,
  date_effective TIMESTAMP,
  montant_attendu NUMERIC NOT NULL,
  montant_collecte NUMERIC NOT NULL DEFAULT 0,
  montant_verse NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_venir' CHECK (statut IN ('a_venir', 'en_cours', 'verse', 'reporte')),
  UNIQUE (tontine_id, numero)
);

-- ÉTAPE 4 : Cotisations attendues à chaque tour
CREATE TABLE IF NOT EXISTS tontine_cotisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tontine_tours(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES tontine_participants(id) ON DELETE CASCADE,
  membre_id UUID NOT NULL REFERENCES users(id),
  montant NUMERIC NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'paye', 'en_retard')),
  mouvement_id UUID REFERENCES mouvements(id) ON DELETE SET NULL,
  date_paiement TIMESTAMP,
  UNIQUE (tour_id, participant_id)
);

-- ÉTAPE 5 : Lien mouvement -> tontine / tour
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS tontine_id UUID REFERENCES tontines(id) ON DELETE SET NULL;
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS tontine_tour_id UUID REFERENCES tontine_tours(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mouvements_tontine ON mouvements(tontine_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_tour ON mouvements(tontine_tour_id);
CREATE INDEX IF NOT EXISTS idx_tours_tontine ON tontine_tours(tontine_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_tour ON tontine_cotisations(tour_id);

-- ÉTAPE 6 : Droits
ALTER TABLE tontine_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE tontine_tours DISABLE ROW LEVEL SECURITY;
ALTER TABLE tontine_cotisations DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tontine_participants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tontine_tours TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tontine_cotisations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tontines TO anon, authenticated;

-- Recharger le cache de l'API pour les relations imbriquées
NOTIFY pgrst, 'reload schema';

SELECT '✅ Module tontine migré' as status;
