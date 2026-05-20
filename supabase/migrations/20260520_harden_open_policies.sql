-- Narrow broad update policies without breaking normal library and feedback flows.

DROP POLICY IF EXISTS "feedback_update" ON public.feedback;
CREATE POLICY "feedback_admin_update" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.set_feedback_vote(uuid, boolean);
CREATE OR REPLACE FUNCTION public.set_feedback_vote(p_feedback_id uuid, p_has_voted boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_votes integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_has_voted THEN
    DELETE FROM public.feedback_votes
    WHERE feedback_id = p_feedback_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.feedback_votes (feedback_id, user_id)
    VALUES (p_feedback_id, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.feedback
  SET votes = (
    SELECT count(*)::integer
    FROM public.feedback_votes
    WHERE feedback_id = p_feedback_id
  )
  WHERE id = p_feedback_id
  RETURNING votes INTO next_votes;

  RETURN COALESCE(next_votes, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.set_feedback_vote(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_feedback_vote(uuid, boolean) TO authenticated;

DROP POLICY IF EXISTS "animes_update_auth" ON public.animes;
CREATE POLICY "animes_update_admin" ON public.animes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP FUNCTION IF EXISTS public.upsert_anime_metadata(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_anime_metadata(p_anime jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anime_id integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  anime_id := NULLIF(p_anime ->> 'id', '')::integer;
  IF anime_id IS NULL OR anime_id <= 0 OR anime_id > 1000000 THEN
    RAISE EXCEPTION 'Invalid anime id';
  END IF;

  INSERT INTO public.animes (
    id, title, img, type, eps, duration, score, color, color_b, genres,
    studio, year, airing, air_day, synopsis, streaming, members, updated_at
  )
  VALUES (
    anime_id,
    LEFT(COALESCE(p_anime ->> 'title', ''), 300),
    NULLIF(LEFT(COALESCE(p_anime ->> 'img', ''), 1000), ''),
    NULLIF(LEFT(COALESCE(p_anime ->> 'type', ''), 40), ''),
    NULLIF(p_anime ->> 'eps', '')::integer,
    NULLIF(p_anime ->> 'duration', '')::integer,
    NULLIF(p_anime ->> 'score', '')::double precision,
    NULLIF(LEFT(COALESCE(p_anime ->> 'color', ''), 40), ''),
    NULLIF(LEFT(COALESCE(p_anime ->> 'color_b', ''), 40), ''),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_anime -> 'genres', '[]'::jsonb))),
    NULLIF(LEFT(COALESCE(p_anime ->> 'studio', ''), 160), ''),
    NULLIF(p_anime ->> 'year', '')::integer,
    COALESCE((p_anime ->> 'airing')::boolean, false),
    NULLIF(LEFT(COALESCE(p_anime ->> 'air_day', ''), 20), ''),
    NULLIF(LEFT(COALESCE(p_anime ->> 'synopsis', ''), 5000), ''),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_anime -> 'streaming', '[]'::jsonb))),
    NULLIF(p_anime ->> 'members', '')::integer,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    img = COALESCE(EXCLUDED.img, public.animes.img),
    type = COALESCE(EXCLUDED.type, public.animes.type),
    eps = COALESCE(EXCLUDED.eps, public.animes.eps),
    duration = COALESCE(EXCLUDED.duration, public.animes.duration),
    score = COALESCE(EXCLUDED.score, public.animes.score),
    color = COALESCE(EXCLUDED.color, public.animes.color),
    color_b = COALESCE(EXCLUDED.color_b, public.animes.color_b),
    genres = CASE WHEN array_length(EXCLUDED.genres, 1) IS NULL THEN public.animes.genres ELSE EXCLUDED.genres END,
    studio = COALESCE(EXCLUDED.studio, public.animes.studio),
    year = COALESCE(EXCLUDED.year, public.animes.year),
    airing = EXCLUDED.airing,
    air_day = COALESCE(EXCLUDED.air_day, public.animes.air_day),
    synopsis = COALESCE(EXCLUDED.synopsis, public.animes.synopsis),
    streaming = CASE WHEN array_length(EXCLUDED.streaming, 1) IS NULL THEN public.animes.streaming ELSE EXCLUDED.streaming END,
    members = COALESCE(EXCLUDED.members, public.animes.members),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_anime_metadata(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_anime_metadata(jsonb) TO authenticated;
