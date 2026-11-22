-- The booklet becomes 18 collectibles with 3D models, stored in assets/collection/<id>.glb.
-- Nothing is deleted: items 19-24 are retired and their rows stay. The emoji column is no longer read.
ALTER TABLE collection_items
  ADD COLUMN active boolean NOT NULL DEFAULT false,
  ADD COLUMN credit jsonb;

UPDATE collection_items i
SET chapter = v.chapter, name = v.name, credit = v.credit::jsonb, active = true
FROM (VALUES
  (1, 'creatures', 'Pink Axolotl', '{"title": "Cute Axolotl - Tripo AI vs SupaVoxel", "author": "Maya Nakamura", "source": "https://sketchfab.com/3d-models/cute-axolotl-tripo-ai-vs-supavoxel-d471cebc1a8446469c45dc7ffbc6e6b2", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (2, 'creatures', 'Ghost Kitty', '{"title": "Cute Cat", "author": "egaregiani20", "source": "https://sketchfab.com/3d-models/cute-cat-976826db61a9442bade9bf5cab832075", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (3, 'creatures', 'Sweetheart Cat', '{"title": "Cute Cat", "author": "Sabrina Zakir", "source": "https://sketchfab.com/3d-models/cute-cat-df659aed13ad4d158481df6f61baeae8", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (4, 'creatures', 'Hungry Cat', '{"title": "Just a Hungry Cat", "author": "Coco Jinjo", "source": "https://sketchfab.com/3d-models/just-a-hungry-cat-97913cc5c44e4e6793385b988aac97c1", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized, glow softened"}'),
  (5, 'creatures', 'Little Reindeer', '{"title": "Christmas cute reindeer", "author": "kiiztie", "source": "https://sketchfab.com/3d-models/christmas-cute-reindeer-4252a63ee1dd40c6a78c698cf0d3a313", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (6, 'nature', 'Snow Globe', '{"title": "Snowglobe", "author": "jpgrandi", "source": "https://sketchfab.com/3d-models/snowglobe-023cd6bbc64c43128e286dff47341489", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized, glass made more visible"}'),
  (7, 'nature', 'Starry Bauble', '{"title": "Christmas Tree Bauble", "author": "QuantumBerry", "source": "https://sketchfab.com/3d-models/christmas-tree-bauble-a21c89d379594eafa27ed9666d3be060", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (8, 'nature', 'Cosy Stocking', '{"title": "Christmas Socket", "author": "Marcin.Kwiatkowski", "source": "https://sketchfab.com/3d-models/christmas-socket-f935bef5dbd747d68fda2b49cf9a4de0", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (9, 'nature', 'Carved Egg', '{"title": "Ornament Easter Egg", "author": "RunemarkStudio", "source": "https://sketchfab.com/3d-models/ornament-easter-egg-3895e066301246c4a89af36375e56b6c", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (10, 'student-life', 'Cookie Platter', '{"title": "Christmas Cookies Collection", "author": "Martini-SF", "source": "https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8", "license": "CC BY-NC 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc/4.0/", "changes": "optimized, separated from the set"}'),
  (11, 'student-life', 'Pine Cookie', '{"title": "Christmas Cookies Collection", "author": "Martini-SF", "source": "https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8", "license": "CC BY-NC 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc/4.0/", "changes": "optimized, separated from the set"}'),
  (12, 'student-life', 'Gingerbread Friend', '{"title": "Christmas Cookies Collection", "author": "Martini-SF", "source": "https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8", "license": "CC BY-NC 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc/4.0/", "changes": "optimized, separated from the set"}'),
  (13, 'student-life', 'Choc Chip Cookie', '{"title": "Christmas Cookies Collection", "author": "Martini-SF", "source": "https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8", "license": "CC BY-NC 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc/4.0/", "changes": "optimized, separated from the set"}'),
  (14, 'student-life', 'Cocoa Mug', '{"title": "Christmas Cookies Collection", "author": "Martini-SF", "source": "https://sketchfab.com/3d-models/christmas-cookies-collection-e4a9dabca39144d2afedaf70cd3905e8", "license": "CC BY-NC 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc/4.0/", "changes": "optimized, separated from the set"}'),
  (15, 'student-life', 'Festive Teapot', '{"title": "Spode - Christmas Teapot", "author": "myndman", "source": "https://sketchfab.com/3d-models/spode-christmas-teapot-a876ea5433f6471a9ad30aa20e510c85", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (16, 'adventure', 'Candy Hammer', '{"title": "LOW POLY Christmas Hammer", "author": "PatelDev", "source": "https://sketchfab.com/3d-models/low-poly-christmas-hammer-3707a4e0be2b453e81c299eb0d60041b", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}'),
  (17, 'adventure', 'Midnight Racer', '{"title": "2015 Ferrari FXX K", "author": "Ddiaz Design", "source": "https://sketchfab.com/3d-models/2015-ferrari-fxx-k-8508899a06754aee90286c9bceabe63c", "license": "CC BY-NC-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/", "changes": "optimized, shine increased"}'),
  (18, 'adventure', 'Scarlet Racer', '{"title": "Ferrari F1 2019", "author": "valvetin", "source": "https://sketchfab.com/3d-models/ferrari-f1-2019-1b050bffe4e749b586b4782ee7ff4fd0", "license": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/", "changes": "optimized"}')
) AS v (id, chapter, name, credit)
WHERE i.id = v.id;

ALTER TABLE collection_items ADD CONSTRAINT collection_items_credit CHECK (NOT active OR credit IS NOT NULL);

-- A find of a retired item also unlocks a model the student doesn't have, so nobody loses progress.
DO $$
DECLARE find record;
BEGIN
  FOR find IN
    SELECT c.user_id, c.found_at
    FROM user_collection c JOIN collection_items i ON i.id = c.item_id
    WHERE NOT i.active
    ORDER BY c.found_at
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
