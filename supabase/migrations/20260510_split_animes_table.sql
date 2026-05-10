-- Create shared animes table with all metadata
CREATE TABLE IF NOT EXISTS animes (
  id         integer PRIMARY KEY,
  title      text,
  img        text,
  type       text,
  eps        integer,
  duration   integer,
  score      float,
  color      text,
  color_b    text,
  genres     text[],
  studio     text,
  year       integer,
  airing     boolean,
  air_day    text,
  synopsis   text,
  streaming  text[],
  members    integer,
  updated_at timestamptz DEFAULT now()
);

-- Migrate existing anime metadata from user_anime into animes
-- On conflict (same anime added by multiple users) keep the most recent
INSERT INTO animes (id, title, img, type, eps, duration, score, color, color_b, genres, studio, year, airing, air_day, synopsis, streaming, members, updated_at)
SELECT DISTINCT ON (anime_id)
  anime_id, title, img, type, eps, duration, score, color, color_b, genres, studio, NULLIF(year, '')::integer, airing, air_day, synopsis, streaming, members, updated_at
FROM user_anime
WHERE anime_id IS NOT NULL
ORDER BY anime_id, updated_at DESC NULLS LAST
ON CONFLICT (id) DO UPDATE SET
  title      = EXCLUDED.title,
  img        = EXCLUDED.img,
  type       = EXCLUDED.type,
  eps        = EXCLUDED.eps,
  duration   = EXCLUDED.duration,
  score      = EXCLUDED.score,
  color      = EXCLUDED.color,
  color_b    = EXCLUDED.color_b,
  genres     = EXCLUDED.genres,
  studio     = EXCLUDED.studio,
  year       = EXCLUDED.year,
  airing     = EXCLUDED.airing,
  air_day    = EXCLUDED.air_day,
  synopsis   = EXCLUDED.synopsis,
  streaming  = EXCLUDED.streaming,
  members    = EXCLUDED.members,
  updated_at = EXCLUDED.updated_at;

-- Drop metadata columns from user_anime (now lives in animes)
ALTER TABLE user_anime
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS img,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS eps,
  DROP COLUMN IF EXISTS duration,
  DROP COLUMN IF EXISTS score,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS color_b,
  DROP COLUMN IF EXISTS genres,
  DROP COLUMN IF EXISTS studio,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS airing,
  DROP COLUMN IF EXISTS air_day,
  DROP COLUMN IF EXISTS synopsis,
  DROP COLUMN IF EXISTS streaming,
  DROP COLUMN IF EXISTS members;

-- Add foreign key from user_anime to animes
ALTER TABLE user_anime
  ADD CONSTRAINT fk_user_anime_anime
  FOREIGN KEY (anime_id) REFERENCES animes(id)
  ON DELETE CASCADE;

-- Enable RLS on animes (public read, authenticated write)
ALTER TABLE animes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "animes_read_all"  ON animes FOR SELECT USING (true);
CREATE POLICY "animes_write_auth" ON animes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "animes_update_auth" ON animes FOR UPDATE USING (auth.uid() IS NOT NULL);
