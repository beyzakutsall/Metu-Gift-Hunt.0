-- Nullable, because gifts hidden before searching existed have no riddle. Their hider can add one.
ALTER TABLE gifts
  ADD COLUMN location_key  text,
  ADD COLUMN location_name text,
  ADD COLUMN clue          text CHECK (char_length(clue) BETWEEN 3 AND 200),
  ADD COLUMN riddle        text CHECK (char_length(riddle) BETWEEN 5 AND 200),
  ADD COLUMN answers       text[] CHECK (cardinality(answers) BETWEEN 1 AND 5),
  ADD COLUMN found_at      timestamptz,
  ADD CONSTRAINT gifts_puzzle_complete
    CHECK (num_nulls(location_key, location_name, clue, riddle, answers) IN (0, 5));
CREATE INDEX gifts_findable_idx ON gifts (hider_id) WHERE found_at IS NULL AND riddle IS NOT NULL;

CREATE TABLE hunts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id       uuid NOT NULL REFERENCES gifts ON DELETE CASCADE,
  seeker_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'found', 'given_up', 'failed', 'expired')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  -- Only that the student arrived. Positions are never stored.
  arrived_at    timestamptz,
  wrong_answers smallint NOT NULL DEFAULT 0 CHECK (wrong_answers BETWEEN 0 AND 5),
  found_at      timestamptz,
  item_id       smallint REFERENCES collection_items,
  CHECK ((status = 'found') = (found_at IS NOT NULL AND item_id IS NOT NULL))
);
-- A student hunts one gift at a time, a gift has one hunter at a time, and one finder ever.
CREATE UNIQUE INDEX hunts_one_active_per_seeker ON hunts (seeker_id) WHERE status = 'active';
CREATE UNIQUE INDEX hunts_one_active_per_gift ON hunts (gift_id) WHERE status = 'active';
CREATE UNIQUE INDEX hunts_one_finder_per_gift ON hunts (gift_id) WHERE status = 'found';
CREATE INDEX hunts_seeker_gift_idx ON hunts (seeker_id, gift_id);

-- Apart from hunts, so ordinary queries never load image bytes.
CREATE TABLE find_photos (
  hunt_id    uuid PRIMARY KEY REFERENCES hunts ON DELETE CASCADE,
  jpeg       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
