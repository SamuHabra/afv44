-- Simule l'environnement Supabase
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'x';
GRANT anon, authenticated TO authenticator;
CREATE SCHEMA extensions; CREATE SCHEMA auth;
CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
ALTER DATABASE t SET search_path = public, extensions;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(auth.jwt()->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA public, extensions, auth TO anon, authenticated;
GRANT ALL ON SCHEMA public TO anon, authenticated;
