-- Finding a gift is now proved with the camera: the hider photographs the spot, the finder's camera
-- has to see the same place. Older gifts have no photos and leave the hunt pool.
ALTER TABLE gifts ADD COLUMN floor text CHECK (char_length(floor) BETWEEN 1 AND 40);

-- The hider's photos of the spot. Never sent to a finder: they'd hold the screen up to the camera.
-- `features` is all matching needs. `jpeg` is kept only for moderation and is cleared after 30 days.
CREATE TABLE gift_scenes (
  gift_id    uuid NOT NULL REFERENCES gifts ON DELETE CASCADE,
  idx        smallint NOT NULL CHECK (idx BETWEEN 0 AND 2),
  features   bytea NOT NULL,
  jpeg       bytea,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gift_id, idx)
);

ALTER TABLE hunts
  -- Camera frames in a row that matched the spot. A miss resets it.
  ADD COLUMN match_streak int NOT NULL DEFAULT 0,
  -- All frames tried. The riddle opens as a fallback after enough of them.
  ADD COLUMN frames_tried int NOT NULL DEFAULT 0;
