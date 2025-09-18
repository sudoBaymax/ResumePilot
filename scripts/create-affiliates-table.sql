-- Create affiliates table for referral program
CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username VARCHAR(32) NOT NULL UNIQUE,
  email TEXT NOT NULL,
  website TEXT,
  audience TEXT NOT NULL,
  payout_email TEXT NOT NULL,
  message TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Enforce lowercase usernames (Postgres 12+)
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_username_lower ON affiliates (LOWER(username)); 