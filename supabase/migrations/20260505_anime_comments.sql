CREATE TABLE anime_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id   integer NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE anime_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_read"   ON anime_comments FOR SELECT USING (true);
CREATE POLICY "ac_insert" ON anime_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ac_delete" ON anime_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_anime_comments ON anime_comments(anime_id, created_at DESC);
