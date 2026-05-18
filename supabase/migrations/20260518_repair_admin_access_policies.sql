CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email'), '') = 'joaoguiar99@gmail.com'
$$;

ALTER TABLE public.admin_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_error_logs_admin_select" ON public.admin_error_logs;
CREATE POLICY "admin_error_logs_admin_select" ON public.admin_error_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_error_logs_admin_insert" ON public.admin_error_logs;
CREATE POLICY "admin_error_logs_admin_insert" ON public.admin_error_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_anime_admin_select" ON public.user_anime;
CREATE POLICY "user_anime_admin_select" ON public.user_anime
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "site_metrics_admin_select" ON public.site_metrics_events;
CREATE POLICY "site_metrics_admin_select" ON public.site_metrics_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
