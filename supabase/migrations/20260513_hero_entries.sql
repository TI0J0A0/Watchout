-- Admin-controlled homepage hero carousel.
CREATE TABLE IF NOT EXISTS public.hero_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id   integer     NOT NULL,
  image_url  text        NOT NULL,
  hide_title boolean     NOT NULL DEFAULT true,
  active     boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_entries_select_active" ON public.hero_entries;
DROP POLICY IF EXISTS "hero_entries_admin_all" ON public.hero_entries;

CREATE POLICY "hero_entries_select_active" ON public.hero_entries
  FOR SELECT USING (active = true OR public.is_admin());

CREATE POLICY "hero_entries_admin_all" ON public.hero_entries
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
