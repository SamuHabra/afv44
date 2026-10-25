-- ============================================
-- 📅 MODULE RÉUNIONS - MIGRATION BACKEND
-- ============================================
-- Prérequis : update-base.sql
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

-- ÉTAPE 1 : Colonnes supplémentaires sur reunions
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS type_reunion TEXT DEFAULT 'presentielle';
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS hote_id UUID REFERENCES users(id);          -- rotation : chez quel membre
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]'::jsonb;          -- suivi des actions à mener
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS rapport_financier JSONB;                    -- état de trésorerie présenté
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS statut_pv TEXT DEFAULT 'non_redige';
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS pv_redige_par UUID REFERENCES users(id);
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS pv_valide_par UUID REFERENCES users(id);
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS date_pv_validation TIMESTAMP;
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS date_demarrage TIMESTAMP;
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS date_fin TIMESTAMP;
ALTER TABLE reunions ADD COLUMN IF NOT EXISTS total_amendes NUMERIC DEFAULT 0;

ALTER TABLE reunions DROP CONSTRAINT IF EXISTS reunions_type_reunion_check;
ALTER TABLE reunions ADD CONSTRAINT reunions_type_reunion_check CHECK (type_reunion IN ('presentielle'));
ALTER TABLE reunions DROP CONSTRAINT IF EXISTS reunions_statut_pv_check;
ALTER TABLE reunions ADD CONSTRAINT reunions_statut_pv_check CHECK (statut_pv IN ('non_redige', 'redige', 'valide'));

-- ÉTAPE 2 : Lien mouvement -> réunion (cotisations, amendes, sorties faites pendant la séance)
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS reunion_id UUID REFERENCES reunions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mouvements_reunion ON mouvements(reunion_id);

-- ÉTAPE 3 : Barème des amendes (montants automatiques, modifiables)
CREATE TABLE IF NOT EXISTS types_amende (
  code TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  montant NUMERIC NOT NULL
);

INSERT INTO types_amende (code, libelle, montant) VALUES
  ('retard', 'Retard (+1h)', 500),
  ('bavardage', 'Bavardage', 100),
  ('querelle', 'Querelle/Bagarre', 2000),
  ('dresscode', 'Non-respect dress code', 1000),
  ('cotisation', 'Échec cotisation', 1000)
ON CONFLICT (code) DO NOTHING;

-- ÉTAPE 4 : Amendes saisies pendant une réunion
CREATE TABLE IF NOT EXISTS amendes_reunion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reunion_id UUID NOT NULL REFERENCES reunions(id) ON DELETE CASCADE,
  membre_id UUID NOT NULL REFERENCES users(id),
  type_amende TEXT NOT NULL REFERENCES types_amende(code),
  montant NUMERIC NOT NULL,
  mouvement_id UUID REFERENCES mouvements(id) ON DELETE SET NULL,
  cree_par UUID REFERENCES users(id),
  date TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_amendes_reunion ON amendes_reunion(reunion_id);

-- ÉTAPE 5 : Notifications dans l'application (convocations)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  message TEXT,
  reunion_id UUID REFERENCES reunions(id) ON DELETE CASCADE,
  lu BOOLEAN DEFAULT false,
  date TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, lu);

-- ÉTAPE 6 : Droits (même approche que le reste de l'app : accès via la clé anon)
ALTER TABLE types_amende DISABLE ROW LEVEL SECURITY;
ALTER TABLE amendes_reunion DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.types_amende TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amendes_reunion TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO anon, authenticated;

SELECT '✅ Module réunions migré' as status;
