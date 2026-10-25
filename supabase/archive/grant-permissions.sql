-- ============================================
-- ACCORDER LES PERMISSIONS DE BASE
-- ============================================
-- À exécuter APRÈS le schema.sql principal
-- ============================================

-- Accorder les permissions SELECT au rôle anon pour toutes les tables
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.caisses TO anon;
GRANT SELECT ON public.mouvements TO anon;
GRANT SELECT ON public.prets TO anon;
GRANT SELECT ON public.remboursements TO anon;
GRANT SELECT ON public.reunions TO anon;
GRANT SELECT ON public.tontines TO anon;
GRANT SELECT ON public.rangs_tontine TO anon;
GRANT SELECT ON public.distributions TO anon;
GRANT SELECT ON public.exercices TO anon;
GRANT SELECT ON public.parametres TO anon;
GRANT SELECT ON public.audit_log TO anon;
GRANT SELECT ON public.capital_temps TO anon;

-- Accorder les permissions INSERT pour permettre la création de données
GRANT INSERT ON public.users TO anon;
GRANT INSERT ON public.caisses TO anon;
GRANT INSERT ON public.mouvements TO anon;
GRANT INSERT ON public.prets TO anon;
GRANT INSERT ON public.remboursements TO anon;
GRANT INSERT ON public.reunions TO anon;
GRANT INSERT ON public.tontines TO anon;
GRANT INSERT ON public.rangs_tontine TO anon;
GRANT INSERT ON public.distributions TO anon;
GRANT INSERT ON public.exercices TO anon;
GRANT INSERT ON public.parametres TO anon;
GRANT INSERT ON public.audit_log TO anon;
GRANT INSERT ON public.capital_temps TO anon;

-- Accorder les permissions UPDATE pour permettre la modification
GRANT UPDATE ON public.users TO anon;
GRANT UPDATE ON public.caisses TO anon;
GRANT UPDATE ON public.mouvements TO anon;
GRANT UPDATE ON public.prets TO anon;
GRANT UPDATE ON public.remboursements TO anon;
GRANT UPDATE ON public.reunions TO anon;
GRANT UPDATE ON public.tontines TO anon;
GRANT UPDATE ON public.rangs_tontine TO anon;
GRANT UPDATE ON public.distributions TO anon;
GRANT UPDATE ON public.exercices TO anon;
GRANT UPDATE ON public.parametres TO anon;
GRANT UPDATE ON public.audit_log TO anon;
GRANT UPDATE ON public.capital_temps TO anon;

-- Accorder les permissions pour les séquences (auto-incrémentation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Après exécution, vous devriez pouvoir :
-- ✅ Voir les utilisateurs
-- ✅ Voir les caisses
-- ✅ Voir les mouvements
-- ✅ Créer de nouvelles données
-- ✅ Modifier les données existantes
-- ============================================
