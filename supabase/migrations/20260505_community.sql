-- Forum topics
CREATE TABLE forum_topics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anime_id     integer,
  anime_title  text,
  title        text NOT NULL,
  content      text NOT NULL,
  reply_count  integer DEFAULT 0,
  views        integer DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Forum replies
CREATE TABLE forum_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   uuid REFERENCES forum_topics(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Feedback
CREATE TABLE feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        text CHECK (type IN ('idea','bug','other')) NOT NULL,
  title       text NOT NULL,
  description text NOT NULL,
  status      text DEFAULT 'open' CHECK (status IN ('open','reviewing','done')),
  votes       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- One vote per user per feedback item
CREATE TABLE feedback_votes (
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES feedback(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, feedback_id)
);

-- Auto-increment reply_count
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_topics SET reply_count = reply_count + 1, updated_at = now()
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reply_count
AFTER INSERT ON forum_posts
FOR EACH ROW EXECUTE FUNCTION increment_reply_count();

CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_topics SET reply_count = GREATEST(reply_count - 1, 0)
  WHERE id = OLD.topic_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reply_count_del
AFTER DELETE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION decrement_reply_count();

-- RLS
ALTER TABLE forum_topics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_read"   ON forum_topics FOR SELECT USING (true);
CREATE POLICY "topics_insert" ON forum_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_delete" ON forum_topics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "posts_read"   ON forum_posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON forum_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "feedback_read"   ON feedback FOR SELECT USING (true);
CREATE POLICY "feedback_insert" ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_read"   ON feedback_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON feedback_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON feedback_votes FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_forum_topics_updated ON forum_topics(updated_at DESC);
CREATE INDEX idx_forum_posts_topic    ON forum_posts(topic_id, created_at);
CREATE INDEX idx_feedback_votes       ON feedback(votes DESC);
CREATE INDEX idx_feedback_votes_fid   ON feedback_votes(feedback_id);
