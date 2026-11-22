import type pg from 'pg'
import { CAMPUS_TIME_ZONE, DAILY_LIMITS } from '../../shared/gameRules.js'
import { transaction } from './database.js'
import { AppError } from './errors.js'
import type { NotificationHub } from './notificationHub.js'

interface Gift {
  id: string
  latitude: number
  longitude: number
  note: string
  createdAt: Date
}

interface HideInput {
  requestId: string
  latitude: number
  longitude: number
  note: string
}

// Deliberately without item_id: not even the hider learns which sticker is inside.
const COLUMNS = 'id, latitude, longitude, note, created_at AS "createdAt"'

export function createGiftService(pool: pg.Pool, hub: NotificationHub) {
  return {
    async hide(userId: string, { requestId, latitude, longitude, note }: HideInput) {
      const result = await transaction(pool, async (db) => {
        // One hide at a time. This makes the daily count safe, and makes notification ids commit in
        // order, so "read up to id N" can never skip one that was still being saved.
        await db.query("SELECT pg_advisory_xact_lock(hashtext('campus_quest_hide_gift'))")

        const repeat = await db.query<Gift>(`SELECT ${COLUMNS} FROM gifts WHERE hider_id = $1 AND request_id = $2`, [
          userId,
          requestId,
        ])
        if (repeat.rows[0]) return { gift: repeat.rows[0], notification: null }

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
        const created = await db.query<Gift>(
          `INSERT INTO gifts (hider_id, request_id, item_id, latitude, longitude, note)
           VALUES ($1, $2, (SELECT id FROM collection_items ORDER BY random() LIMIT 1), $3, $4, $5)
           RETURNING ${COLUMNS}`,
          [userId, requestId, latitude, longitude, note],
        )
        const gift = created.rows[0]!
        const event = await db.query<{ id: number; createdAt: Date }>(
          'INSERT INTO notifications (gift_id) VALUES ($1) RETURNING id, created_at AS "createdAt"',
          [gift.id],
        )
        return { gift, notification: event.rows[0]! }
      })

      // Only after commit, and never twice for a retried request.
      if (result.notification) hub.publish(result.notification, userId)
      return { gift: result.gift, created: result.notification !== null }
    },

    async mine(userId: string) {
      const { rows } = await pool.query<Gift>(
        `SELECT ${COLUMNS} FROM gifts WHERE hider_id = $1 ORDER BY created_at DESC`,
        [userId],
      )
      return rows
    },
  }
}
export type GiftService = ReturnType<typeof createGiftService>
