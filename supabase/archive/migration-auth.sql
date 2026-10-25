-- ============================================
-- MIGRATION : AUTHENTIFICATION SUPABASE
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Ajouter les colonnes pour l'authentification
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID,
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;

-- 2. Index pour auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- 3. Fonction pour créer un utilisateur avec Supabase Auth
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_nom TEXT,
  p_prenom TEXT,
  p_email TEXT,
  p_telephone TEXT,
  p_role TEXT,
  p_password TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_auth_id UUID;
BEGIN
  -- Créer l'utilisateur dans auth.users via Supabase Auth
  -- Note: Cette fonction doit être appelée depuis une Edge Function
  -- car elle nécessite les permissions admin
  
  -- Pour l'instant, on crée juste dans public.users
  INSERT INTO public.users (
    nom, prenom, email, telephone, role, actif, 
    date_inscription, first_login, password_changed
  ) VALUES (
    p_nom, p_prenom, p_email, p_telephone, p_role, true,
    NOW(), true, false
  )
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger pour marquer first_login = false après changement de mot de passe
CREATE OR REPLACE FUNCTION mark_password_changed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password_changed = true AND OLD.password_changed = false THEN
    NEW.first_login = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_password_changed ON users;
CREATE TRIGGER trigger_password_changed
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION mark_password_changed();

-- 5. Politique RLS : Seul l'admin peut créer des utilisateurs
DROP POLICY IF EXISTS users_insert_admin ON users;
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 6. Politique RLS : L'utilisateur peut modifier son propre mot de passe
DROP POLICY IF EXISTS users_update_own_password ON users;
CREATE POLICY "users_update_own_password" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. Fonction pour générer un mot de passe temporaire
CREATE OR REPLACE FUNCTION generate_temp_password() RETURNS TEXT AS $$
DECLARE
  v_chars TEXT := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_password TEXT := '';
  v_i INTEGER;
BEGIN
  FOR v_i IN 1..10 LOOP
    v_password := v_password || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
  END LOOP;
  RETURN v_password;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT '✅ Migration authentification terminée' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('auth_id', 'first_login', 'password_changed');
