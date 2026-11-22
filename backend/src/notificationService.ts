import type pg from 'pg'

export function createNotificationService(pool: pg.Pool) {
  return {
    async list(userId: string) {
      // Only events since the student joined. Your own are never unread.
      const visible = `
        SELECT n.id, n.created_at AS "createdAt", g.hider_id = u.id AS mine,
               g.hider_id = u.id OR n.id <= COALESCE(r.last_read_id, 0) AS read
        FROM users u
        JOIN notifications n ON n.created_at >= u.created_at
        JOIN gifts g ON g.id = n.gift_id
        LEFT JOIN notification_reads r ON r.user_id = u.id
        WHERE u.id = $1`
      const [items, unread] = await Promise.all([
        pool.query(`${visible} ORDER BY n.id DESC LIMIT 30`, [userId]),
        pool.query(`SELECT count(*)::int AS count FROM (${visible}) v WHERE NOT v.read`, [userId]),
      ])
      return { items: items.rows, unread: unread.rows[0].count as number }
    },

    async markRead(userId: string, upTo: number) {
      // Clamped, so a made-up id can't hide future notifications.
      await pool.query(
        `INSERT INTO notification_reads (user_id, last_read_id)
         SELECT $1, LEAST($2::int, COALESCE((SELECT max(id) FROM notifications), 0))
         ON CONFLICT (user_id) DO UPDATE
         SET last_read_id = GREATEST(notification_reads.last_read_id, EXCLUDED.last_read_id)`,
        [userId, upTo],
      )
    },
  }
}
export type NotificationService = ReturnType<typeof createNotificationService>
