-- ============================================
-- TRIGGER : CRÉATION AUTOMATIQUE DU COMPTE AUTH
-- ============================================
-- Quand vous créez un utilisateur dans public.users,
-- ce trigger crée automatiquement le compte Auth
-- et lie auth_id
-- ============================================

-- ÉTAPE 1 : Créer la fonction
CREATE OR REPLACE FUNCTION create_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  temp_password TEXT;
  auth_user_id UUID;
BEGIN
  -- Générer un mot de passe temporaire
  temp_password := 'Temp' || substr(md5(random()::text), 1, 8) || '!';
  
  -- Créer l'utilisateur dans auth.users
  -- Note: Cette fonction nécessite les permissions admin
  -- Elle doit être exécutée par un service role
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    NEW.email,
    crypt(temp_password, gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nom', NEW.nom, 'prenom', NEW.prenom, 'role', NEW.role),
    NOW(),
    NOW(),
    '',
    ''
  )
  RETURNING id INTO auth_user_id;
  
  -- Lier auth_id dans public.users
  NEW.auth_id := auth_user_id;
  
  -- Logger le mot de passe temporaire (optionnel)
  RAISE NOTICE 'Compte Auth créé pour % avec mot de passe temporaire: %', NEW.email, temp_password;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 2 : Créer le trigger
DROP TRIGGER IF EXISTS trigger_create_auth_user ON users;
CREATE TRIGGER trigger_create_auth_user
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.auth_id IS NULL AND NEW.email IS NOT NULL)
  EXECUTE FUNCTION create_auth_user();

-- ÉTAPE 3 : Test
-- Essayez de créer un nouvel utilisateur :
-- INSERT INTO users (nom, prenom, email, telephone, role, actif)
-- VALUES ('Test', 'User', 'test@exemple.com', '+221 77 000 00 00', 'membre', true);

-- Vérifiez que auth_id a été automatiquement rempli :
-- SELECT * FROM users WHERE email = 'test@exemple.com';

-- ============================================
-- ALTERNATIVE SIMPLIFIÉE
-- ============================================
-- Si le trigger ne fonctionne pas (permissions),
-- utilisez cette approche manuelle :
--
-- 1. Créez l'utilisateur dans public.users
-- 2. Créez le compte Auth manuellement dans le Dashboard
-- 3. Liez avec : UPDATE users SET auth_id = 'UUID' WHERE email = 'email';
-- ============================================

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT '✅ Trigger créé' as status;
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'trigger_create_auth_user';
