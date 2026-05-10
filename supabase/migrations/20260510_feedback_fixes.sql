-- Allow votes and status updates on feedback
CREATE POLICY "feedback_update" ON feedback FOR UPDATE USING (true);

-- Notify admin when new feedback is created
CREATE OR REPLACE FUNCTION notify_admin_on_feedback()
RETURNS TRIGGER AS $$
DECLARE
  admin_id uuid;
  admin_username text := 'joaoguiar99';
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE username = admin_username LIMIT 1;
  IF admin_id IS NOT NULL AND admin_id <> NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      admin_id,
      'system',
      '[' || UPPER(NEW.type) || '] ' || NEW.title,
      NEW.description,
      jsonb_build_object('feedback_id', NEW.id, 'feedback_type', NEW.type)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_admin_feedback
AFTER INSERT ON feedback
FOR EACH ROW EXECUTE FUNCTION notify_admin_on_feedback();
