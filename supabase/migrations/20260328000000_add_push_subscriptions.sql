-- Migration: add push_subscriptions table for FCM token storage
-- Each row represents one device registration for a given user.
-- A user may have multiple tokens (e.g., different devices / browsers).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id  UUID        NOT NULL REFERENCES dealers(id)    ON DELETE CASCADE,
  fcm_token  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_dealer_id
  ON push_subscriptions (dealer_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own subscription rows.
CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
