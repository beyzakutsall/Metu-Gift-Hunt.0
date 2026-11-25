-- Proof that the student owns their METU inbox. Without it, anyone could take someone else's
-- address or open many accounts, and the daily limits and "not your own gift" rule mean nothing.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

-- Accounts from before this migration were made by the team during development.
UPDATE users SET email_verified_at = created_at;

-- One live code per student. Only its hash is stored.
CREATE TABLE email_verifications (
  user_id    uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  code_hash  text NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);

-- Left over from an earlier sign-up flow and never used since.
DROP TABLE pending_registrations;
