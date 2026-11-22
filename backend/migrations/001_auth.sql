CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          text NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'),
  email             text NOT NULL UNIQUE CHECK (email = lower(email) AND email LIKE '%@metu.edu.tr'),
  password_hash     text NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_key ON users (lower(username));

-- Not a user until the inbox is verified, so nobody can reserve someone else's email or a username.
CREATE TABLE pending_registrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          text NOT NULL,
  email             text NOT NULL,
  password_hash     text NOT NULL,
  token_hash        text NOT NULL UNIQUE,
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL
);
CREATE INDEX pending_registrations_email_idx ON pending_registrations (email, created_at DESC);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);
