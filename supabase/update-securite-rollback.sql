-- ============================================
-- ↩️ RETOUR ARRIÈRE de update-securite-2-verrouillage.sql
-- ============================================
-- Rétablit l'accès ouvert d'avant (à n'utiliser qu'en dépannage, puis relancer l'étape 2 après correction).
-- ⚠️ Ceci ré-ouvre la base au public : à faire au plus court.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', r.tablename);
  END LOOP;
END $$;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION auth_verifier(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION journaliser(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS users_protege ON users;
-- Les gardes ajoutées dans les fonctions restent en place : elles exigent toujours un jeton valide
-- (l'application mise à jour en envoie un à chaque requête).
