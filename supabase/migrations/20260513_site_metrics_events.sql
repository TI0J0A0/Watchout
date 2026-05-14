CREATE TABLE IF NOT EXISTS public.site_metrics_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text        NOT NULL,
  user_id    uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  anime_id   integer     NULL,
  page       text        NULL,
  session_id text        NULL,
  metadata   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_metrics_events_event_type_idx
  ON public.site_metrics_events (event_type);

CREATE INDEX IF NOT EXISTS site_metrics_events_anime_id_idx
  ON public.site_metrics_events (anime_id);

CREATE INDEX IF NOT EXISTS site_metrics_events_created_at_idx
  ON public.site_metrics_events (created_at desc);

ALTER TABLE public.site_metrics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_metrics_insert" ON public.site_metrics_events;
DROP POLICY IF EXISTS "site_metrics_admin_select" ON public.site_metrics_events;

CREATE POLICY "site_metrics_insert" ON public.site_metrics_events
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "site_metrics_admin_select" ON public.site_metrics_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
