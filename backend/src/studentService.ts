import type pg from 'pg'
import { CAMPUS_TIME_ZONE, DAILY_LIMITS } from '../../shared/gameRules.js'

export function createStudentService(pool: pg.Pool) {
  return {
    async profile(userId: string) {
      const [activity, items] = await Promise.all([
        // One statement, so the counts and the reset time agree even across midnight.
        pool.query(
          `WITH today AS (SELECT (now() AT TIME ZONE $2)::date AS day)
           SELECT
             count(*) FILTER (WHERE a.kind = 'search')::int AS searched,
             count(*) FILTER (WHERE a.kind = 'search' AND a.day = t.day)::int AS searched_today,
             count(*) FILTER (WHERE a.kind = 'hide')::int AS hidden,
             count(*) FILTER (WHERE a.kind = 'hide' AND a.day = t.day)::int AS hidden_today,
             (t.day + 1)::timestamp AT TIME ZONE $2 AS resets_at
           FROM today t LEFT JOIN gift_actions a ON a.user_id = $1
           GROUP BY t.day`,
          [userId, CAMPUS_TIME_ZONE],
        ),
        // Name and credit (which names the model) leave the database only once found. CSS blur alone can be removed in devtools.
        pool.query(
          `SELECT i.id, i.chapter, c.found_at AS "foundAt",
             CASE WHEN c.user_id IS NOT NULL THEN i.name END AS name,
             CASE WHEN c.user_id IS NOT NULL THEN i.credit END AS credit
           FROM collection_items i
           LEFT JOIN user_collection c ON c.item_id = i.id AND c.user_id = $1
           WHERE i.active
           ORDER BY i.id`,
          [userId],
        ),
      ])

      const row = activity.rows[0]
      return {
        searches: { today: row.searched_today, limit: DAILY_LIMITS.search, total: row.searched },
        hides: { today: row.hidden_today, limit: DAILY_LIMITS.hide, total: row.hidden },
        resetsAt: row.resets_at,
        items: items.rows,
      }
    },
  }
}
export type StudentService = ReturnType<typeof createStudentService>
