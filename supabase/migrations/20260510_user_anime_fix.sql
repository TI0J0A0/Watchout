-- Deduplicate user_anime: keep only the most recently updated row per user+anime
DELETE FROM user_anime
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, anime_id) id
  FROM user_anime
  ORDER BY user_id, anime_id, updated_at DESC NULLS LAST
);

-- Add unique constraint so upsert onConflict works correctly
ALTER TABLE user_anime
  ADD CONSTRAINT user_anime_user_anime_unique UNIQUE (user_id, anime_id);
