CREATE TABLE IF NOT EXISTS public.hero_settings (
  id         integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_items  integer     NOT NULL DEFAULT 5 CHECK (max_items >= 1 AND max_items <= 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.hero_settings (id, max_items)
VALUES (1, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_settings_select" ON public.hero_settings;
DROP POLICY IF EXISTS "hero_settings_admin_all" ON public.hero_settings;

CREATE POLICY "hero_settings_select" ON public.hero_settings
  FOR SELECT USING (true);

CREATE POLICY "hero_settings_admin_all" ON public.hero_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
