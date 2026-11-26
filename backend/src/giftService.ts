import type pg from 'pg'
import { CAMPUS_TIME_ZONE, DAILY_LIMITS } from '../../shared/gameRules.js'
import { transaction } from './database.js'
import { AppError } from './errors.js'
import type { NotificationHub } from './notificationHub.js'

export interface Puzzle {
  locationKey: string
  locationName: string
  clue: string
  riddle: string
  answers: string[]
}

interface HideInput extends Puzzle {
  requestId: string
  latitude: number
  longitude: number
  note: string
  floor: string
  /** The hider's photos of the spot, already checked. */
  scene: { jpeg: Buffer; features: Buffer }[]
}

// For the hider only. Deliberately without item_id: not even they learn which collectible is inside.
const VIEW = `
  SELECT g.id, g.latitude, g.longitude, g.note, g.created_at AS "createdAt",
         g.location_name AS "locationName", g.floor, g.clue, g.riddle, g.answers, g.found_at AS "foundAt",
         CASE WHEN p.hunt_id IS NOT NULL THEN '/api/hunts/' || p.hunt_id || '/photo' END AS "photoUrl"
  FROM gifts g
  LEFT JOIN hunts h ON h.gift_id = g.id AND h.status = 'found'
  LEFT JOIN find_photos p ON p.hunt_id = h.id`

export function createGiftService(pool: pg.Pool, hub: NotificationHub) {
  const one = async (id: string) => (await pool.query(`${VIEW} WHERE g.id = $1`, [id])).rows[0]

  return {
    async hide(userId: string, input: HideInput) {
      const result = await transaction(pool, async (db) => {
        // One hide at a time. This makes the daily count safe, and makes notification ids commit in
        // order, so "read up to id N" can never skip one that was still being saved.
        await db.query("SELECT pg_advisory_xact_lock(hashtext('campus_quest_hide_gift'))")

        const repeat = await db.query<{ id: string }>('SELECT id FROM gifts WHERE hider_id = $1 AND request_id = $2', [
          userId,
          input.requestId,
        ])
        if (repeat.rows[0]) return { id: repeat.rows[0].id, notification: null }

        const used = await db.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM gift_actions
           WHERE user_id = $1 AND kind = 'hide' AND day = (now() AT TIME ZONE $2)::date`,
          [userId, CAMPUS_TIME_ZONE],
        )
        const count = used.rows[0]!.count
        if (count >= DAILY_LIMITS.hide) {
          throw new AppError(409, 'DAILY_LIMIT', `You’ve hidden all ${DAILY_LIMITS.hide} of today’s gifts. Come back after midnight.`)
        }

        await db.query("INSERT INTO gift_actions (user_id, kind, slot) VALUES ($1, 'hide', $2)", [userId, count + 1])
        const created = await db.query<{ id: string }>(
          `INSERT INTO gifts (hider_id, request_id, item_id, latitude, longitude, note,
                              location_key, location_name, clue, riddle, answers, floor)
           VALUES ($1, $2, (SELECT id FROM collection_items WHERE active ORDER BY random() LIMIT 1), $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [userId, input.requestId, input.latitude, input.longitude, input.note,
           input.locationKey, input.locationName, input.clue, input.riddle, input.answers, input.floor],
        )
        const id = created.rows[0]!.id
        for (const [idx, { jpeg, features }] of input.scene.entries()) {
          await db.query('INSERT INTO gift_scenes (gift_id, idx, features, jpeg) VALUES ($1, $2, $3, $4)', [id, idx, features, jpeg])
        }
        const event = await db.query<{ id: number; createdAt: Date }>(
          'INSERT INTO notifications (gift_id) VALUES ($1) RETURNING id, created_at AS "createdAt"',
          [id],
        )
        return { id, notification: event.rows[0]! }
      })

      // Only after commit, and never twice for a retried request.
      if (result.notification) hub.publish(result.notification, userId)
      return { gift: await one(result.id), created: result.notification !== null }
    },

    async mine(userId: string) {
      return (await pool.query(`${VIEW} WHERE g.hider_id = $1 ORDER BY g.created_at DESC`, [userId])).rows
    },

    async position(userId: string, id: string) {
      const { rows } = await pool.query<{ latitude: number; longitude: number }>(
        'SELECT latitude, longitude FROM gifts WHERE id = $1 AND hider_id = $2',
        [id, userId],
      )
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Gift not found.')
      return rows[0]
    },

    /** Spot photos are for moderation only. After 30 days the features are all that's left. */
    async purgeScenePhotos() {
      await pool.query("UPDATE gift_scenes SET jpeg = NULL WHERE jpeg IS NOT NULL AND created_at < now() - interval '30 days'")
    },

    /** For gifts from before searching existed. Only once, so a riddle can't change during a hunt. */
    async addPuzzle(userId: string, id: string, puzzle: Puzzle) {
      const updated = await pool.query(
        `UPDATE gifts SET location_key = $3, location_name = $4, clue = $5, riddle = $6, answers = $7
         WHERE id = $1 AND hider_id = $2 AND riddle IS NULL`,
        [id, userId, puzzle.locationKey, puzzle.locationName, puzzle.clue, puzzle.riddle, puzzle.answers],
      )
      if (!updated.rowCount) throw new AppError(409, 'ALREADY_SET', 'This gift already has a riddle.')
      return one(id)
    },
  }
}
export type GiftService = ReturnType<typeof createGiftService>
