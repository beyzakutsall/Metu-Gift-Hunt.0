CREATE TABLE collection_items (
  id      smallint PRIMARY KEY,
  chapter text NOT NULL CHECK (chapter IN ('creatures', 'nature', 'student-life', 'adventure')),
  name    text NOT NULL,
  emoji   text NOT NULL
);

CREATE TABLE user_collection (
  user_id  uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  item_id  smallint NOT NULL REFERENCES collection_items,
  found_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- One row per gift searched or hidden. The numbered slot makes the daily limit atomic:
-- two simultaneous requests can't both take slot 2, and slot 3 of searching doesn't exist.
CREATE TABLE gift_actions (
  user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  kind       text NOT NULL,
  day        date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Istanbul')::date,
  slot       smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, day, slot),
  CONSTRAINT gift_actions_daily_limit CHECK (
    (kind = 'search' AND slot BETWEEN 1 AND 2) OR
    (kind = 'hide' AND slot BETWEEN 1 AND 3)
  )
);

INSERT INTO collection_items (id, chapter, name, emoji) VALUES
  ( 1, 'creatures',    'Campus Cat',     '🐱'),
  ( 2, 'creatures',    'Good Dog',       '🐶'),
  ( 3, 'creatures',    'Night Owl',      '🦉'),
  ( 4, 'creatures',    'Prickly Pal',    '🦔'),
  ( 5, 'creatures',    'Quick Squirrel', '🐿️'),
  ( 6, 'creatures',    'Lucky Ladybird', '🐞'),
  ( 7, 'nature',       'Tall Pine',      '🌲'),
  ( 8, 'nature',       'Autumn Leaf',    '🍁'),
  ( 9, 'nature',       'Forest Mushroom','🍄'),
  (10, 'nature',       'Spring Blossom', '🌸'),
  (11, 'nature',       'First Snow',     '❄️'),
  (12, 'nature',       'After the Rain', '🌈'),
  (13, 'student-life', 'Morning Simit',  '🥯'),
  (14, 'student-life', 'Endless Coffee', '☕'),
  (15, 'student-life', 'Finals Survivor','📚'),
  (16, 'student-life', 'Festival Night', '🎸'),
  (17, 'student-life', 'Campus Ring',    '🚌'),
  (18, 'student-life', 'Graduation Cap', '🎓'),
  (19, 'adventure',    'Pathfinder',     '🧭'),
  (20, 'adventure',    'Old Map',        '🗺️'),
  (21, 'adventure',    'Secret Key',     '🗝️'),
  (22, 'adventure',    'Night Trail',    '🔦'),
  (23, 'adventure',    'Shining Star',   '🌟'),
  (24, 'adventure',    'Golden Find',    '🏆');
