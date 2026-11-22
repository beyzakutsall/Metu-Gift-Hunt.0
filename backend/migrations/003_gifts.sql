CREATE TABLE gifts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hider_id   uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  -- Sent by the browser, so retrying after a lost response can't hide a second gift.
  request_id uuid NOT NULL,
  -- Drawn by the server. Secret from everyone, including the hider, until found.
  item_id    smallint NOT NULL REFERENCES collection_items,
  latitude   double precision NOT NULL CHECK (latitude BETWEEN 39.880 AND 39.903),
  longitude  double precision NOT NULL CHECK (longitude BETWEEN 32.760 AND 32.800),
  note       text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hider_id, request_id)
);
CREATE INDEX gifts_hider_idx ON gifts (hider_id, created_at DESC);

-- One row per event, shown to every student, so hiding costs the same with 10 or 10,000 users.
CREATE TABLE notifications (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gift_id    uuid NOT NULL UNIQUE REFERENCES gifts ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_reads (
  user_id      uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  last_read_id integer NOT NULL
);
