-- ─────────────────────────────────────────────────────────────────────────────
-- Watchout – Admin Schema Migration
-- Run once in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ban flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. System announcements table
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text        NOT NULL,
  type       text        NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'warning', 'maintenance')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Scalar JWT admin validator (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email'), '') = 'joaoguiar99@gmail.com'
$$;

-- ── system_announcements RLS ─────────────────────────────────────────────────
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ann_select"    ON public.system_announcements;
DROP POLICY IF EXISTS "ann_admin_all" ON public.system_announcements;

CREATE POLICY "ann_select" ON public.system_announcements
  FOR SELECT USING (true);

CREATE POLICY "ann_admin_all" ON public.system_announcements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── forum_topics RLS (admin delete any topic) ────────────────────────────────
DROP POLICY IF EXISTS "topics_admin_delete" ON public.forum_topics;
CREATE POLICY "topics_admin_delete" ON public.forum_topics
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── forum_posts RLS (admin delete any post — needed for cascade) ─────────────
DROP POLICY IF EXISTS "posts_admin_delete" ON public.forum_posts;
CREATE POLICY "posts_admin_delete" ON public.forum_posts
  FOR DELETE TO authenticated USING (public.is_admin());

-- ── feedback RLS (admin full access) ─────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_admin_all" ON public.feedback;
CREATE POLICY "feedback_admin_all" ON public.feedback
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── profiles RLS (admin can update ban / premium flags) ──────────────────────
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
