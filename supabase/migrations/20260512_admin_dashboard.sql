CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email'), '') = 'joaoguiar99@gmail.com'
$$;

CREATE TABLE IF NOT EXISTS public.admin_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_error_logs_admin_select" ON public.admin_error_logs;
CREATE POLICY "admin_error_logs_admin_select" ON public.admin_error_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_error_logs_admin_insert" ON public.admin_error_logs;
CREATE POLICY "admin_error_logs_admin_insert" ON public.admin_error_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS admin_error_logs_created_at_idx
  ON public.admin_error_logs(created_at DESC);
