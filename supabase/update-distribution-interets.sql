-- ============================================
-- 💰 DISTRIBUTION DES INTÉRÊTS - MIGRATION BACKEND
-- ============================================
-- Répartition de la Caisse Intérêts au prorata temporis (épargne + scolaire),
-- créditée sur l'Épargne Individuelle des membres
-- À exécuter dans Supabase SQL Editor (idempotent)
-- ============================================

CREATE TABLE IF NOT EXISTS distributions_interets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercice_id UUID REFERENCES exercices(id),
  periode_debut DATE NOT NULL,
  date_distribution DATE NOT NULL,
  solde_caisse_interets NUMERIC NOT NULL,          -- solde de la Caisse Intérêts au calcul
  reserve_pct NUMERIC NOT NULL DEFAULT 0 CHECK (reserve_pct >= 0 AND reserve_pct < 100),
  montant_total NUMERIC NOT NULL,                  -- montant réellement distribué
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validee', 'executee')),
  cree_par UUID REFERENCES users(id),
  date_creation TIMESTAMP DEFAULT NOW(),
  valide_par UUID REFERENCES users(id),
  date_validation TIMESTAMP,
  date_execution TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distributions_interets_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distribution_id UUID NOT NULL REFERENCES distributions_interets(id) ON DELETE CASCADE,
  membre_id UUID NOT NULL REFERENCES users(id),
  solde_moyen NUMERIC NOT NULL,
  capital_jours NUMERIC NOT NULL,
  part_pct NUMERIC NOT NULL,
  montant NUMERIC NOT NULL,
  mouvement_sortie_id UUID REFERENCES mouvements(id) ON DELETE SET NULL,
  mouvement_credit_id UUID REFERENCES mouvements(id) ON DELETE SET NULL,
  UNIQUE (distribution_id, membre_id)
);

ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS distribution_interets_id UUID REFERENCES distributions_interets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lignes_distribution ON distributions_interets_lignes(distribution_id);
CREATE INDEX IF NOT EXISTS idx_lignes_membre ON distributions_interets_lignes(membre_id);

ALTER TABLE distributions_interets DISABLE ROW LEVEL SECURITY;
ALTER TABLE distributions_interets_lignes DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions_interets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions_interets_lignes TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Distribution des intérêts migrée' as status;
