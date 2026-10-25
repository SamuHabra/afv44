-- ============================================
-- 🧱 BASE COMMUNE — À EXÉCUTER EN PREMIER
-- ============================================
-- Colonnes utilisées par l'application et par toutes les migrations suivantes,
-- mais absentes de schema.sql (elles venaient d'anciens scripts ou de modifications manuelles).
-- Idempotent.
-- Ordre complet : schema.sql → update-base.sql → update-reunions → update-tontine →
--   update-distribution-interets → update-mon-espace → update-rapports → update-parametres →
--   update-securite-1-jeton → (test dans l'application) → update-securite-2-verrouillage
-- ============================================

-- Caisses : type, cotisation annuelle, caisse système
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS montant_annuel NUMERIC;
ALTER TABLE caisses ADD COLUMN IF NOT EXISTS systeme BOOLEAN DEFAULT false;

-- Mouvements : catégorie (entree / sortie), déduite du type si elle n'est pas fournie
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS categorie TEXT;
UPDATE mouvements SET categorie = CASE WHEN type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet') THEN 'entree' ELSE 'sortie' END
WHERE categorie IS NULL;

CREATE OR REPLACE FUNCTION trg_mouvement_categorie() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.categorie IS NULL THEN
    NEW.categorie := CASE WHEN NEW.type IN ('cotisation', 'epargne', 'penalite', 'don', 'remboursement', 'interet') THEN 'entree' ELSE 'sortie' END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS mouvement_categorie ON mouvements;
CREATE TRIGGER mouvement_categorie BEFORE INSERT ON mouvements FOR EACH ROW EXECUTE FUNCTION trg_mouvement_categorie();

