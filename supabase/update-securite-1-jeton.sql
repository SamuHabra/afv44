-- ============================================
-- 🔐 SÉCURITÉ — ÉTAPE 1/2 : JETON DE SESSION SIGNÉ
-- ============================================
-- Cette étape est SANS RISQUE : elle n'enlève aucun droit.
-- Elle permet à la base de savoir QUI fait chaque requête (jeton signé à la connexion).
--
-- AVANT D'EXÉCUTER : remplacez COLLER_ICI_LE_JWT_SECRET (ligne ci-dessous) par le secret JWT
--   Supabase → Project Settings → JWT Keys (ou API) → onglet « Legacy JWT Secret » → copier.
-- Ne partagez jamais ce secret et ne le mettez jamais dans le code de l'application.
--
-- Prérequis : update-mon-espace.sql exécuté (auth_login, journal_connexions).
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============= SECRET (schéma privé, non exposé par l'API) =============
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.secrets (
  nom TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);
REVOKE ALL ON private.secrets FROM PUBLIC, anon, authenticated;
-- RLS activée sans aucune règle : personne ne peut lire cette table par l'API.
-- Seules les fonctions sécurisées (signer_jwt) y accèdent, avec les droits du propriétaire.
ALTER TABLE private.secrets ENABLE ROW LEVEL SECURITY;

-- ⬇⬇⬇ À REMPLACER ⬇⬇⬇
INSERT INTO private.secrets (nom, valeur) VALUES ('jwt_secret', 'COLLER_ICI_LE_JWT_SECRET')
ON CONFLICT (nom) DO UPDATE SET valeur = EXCLUDED.valeur
  WHERE private.secrets.valeur LIKE 'COLLER%' AND EXCLUDED.valeur NOT LIKE 'COLLER%';
-- (Le secret déjà enregistré n'est jamais écrasé par le texte d'exemple.)

-- ============= SIGNATURE DU JETON (HS256) =============
CREATE OR REPLACE FUNCTION private.b64url(b BYTEA) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(replace(encode(b, 'base64'), E'\n', ''), '+/=', '-_');
$$;

CREATE OR REPLACE FUNCTION private.signer_jwt(p_payload JSONB) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_secret TEXT; v_tete TEXT; v_corps TEXT; v_sig TEXT;
BEGIN
  SELECT valeur INTO v_secret FROM private.secrets WHERE nom = 'jwt_secret';
  IF v_secret IS NULL OR v_secret LIKE 'COLLER%' THEN
    RAISE EXCEPTION 'Secret JWT non configuré';
  END IF;
  v_tete := private.b64url(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'));
  v_corps := private.b64url(convert_to(p_payload::text, 'utf8'));
  v_sig := private.b64url(hmac(convert_to(v_tete || '.' || v_corps, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'));
  RETURN v_tete || '.' || v_corps || '.' || v_sig;
END;
$$;
REVOKE ALL ON FUNCTION private.signer_jwt(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.b64url(BYTEA) FROM PUBLIC, anon, authenticated;

-- ============= IDENTITÉ DE L'APPELANTE =============
-- L'identité vient du jeton ; le RÔLE est relu en base à chaque requête :
-- un compte désactivé ou rétrogradé perd ses droits immédiatement.
CREATE OR REPLACE FUNCTION app_uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role FROM users WHERE id = app_uid() AND actif = true), '');
$$;

CREATE OR REPLACE FUNCTION a_role(VARIADIC p_roles TEXT[]) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT app_role() = ANY(p_roles);
$$;

-- Sert au test « jeton accepté ? » dans Paramètres → Sécurité
CREATE OR REPLACE FUNCTION whoami() RETURNS JSONB
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('uid', app_uid(), 'role', app_role(), 'pg_role', current_user);
$$;

GRANT EXECUTE ON FUNCTION app_uid(), app_role(), a_role(TEXT[]), whoami() TO anon, authenticated;

-- ============= CONNEXION : renvoie aussi un jeton valable 12 h =============
CREATE OR REPLACE FUNCTION auth_login(p_telephone TEXT, p_password TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_user users%ROWTYPE;
  v_echecs INTEGER;
  v_jeton TEXT;
  v_maintenant BIGINT := floor(extract(epoch FROM now()));
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

  -- Jeton : si le secret n'est pas encore configuré, la connexion fonctionne sans jeton
  BEGIN
    v_jeton := private.signer_jwt(jsonb_build_object(
      'aud', 'authenticated', 'role', 'authenticated', 'sub', v_user.id,
      'iat', v_maintenant, 'exp', v_maintenant + 12 * 3600));
  EXCEPTION WHEN OTHERS THEN
    v_jeton := NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'user', to_jsonb(v_user) - 'password_hash', 'token', v_jeton);
END;
$$;
GRANT EXECUTE ON FUNCTION auth_login(TEXT, TEXT) TO anon, authenticated;

-- Vérification : le secret est-il bien enregistré ?
SELECT CASE WHEN valeur LIKE 'COLLER%' THEN '❌ Secret JWT NON configuré : modifiez le script et relancez-le'
            ELSE '✅ Secret JWT enregistré' END AS etat
FROM private.secrets WHERE nom = 'jwt_secret';
