-- The two Ferrari models (17 Midnight Racer, 18 Scarlet Racer) leave the booklet: the brand isn't ours to use.
-- Numbered 008 so it can't clash with the 007 migration being written for the camera work.
UPDATE collection_items SET active = false WHERE id IN (17, 18);

-- As in 005: whoever found one of them gets a collectible they don't have yet, so nobody loses progress.
DO $$
DECLARE find record;
BEGIN
  FOR find IN
    SELECT user_id, found_at FROM user_collection WHERE item_id IN (17, 18) ORDER BY found_at
  LOOP
    INSERT INTO user_collection (user_id, item_id, found_at)
    SELECT find.user_id, i.id, find.found_at
    FROM collection_items i
    WHERE i.active
      AND NOT EXISTS (SELECT 1 FROM user_collection o WHERE o.user_id = find.user_id AND o.item_id = i.id)
    ORDER BY i.id
    LIMIT 1;
  END LOOP;
END $$;
