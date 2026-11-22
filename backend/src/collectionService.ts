import type pg from 'pg'

export function createCollectionService(pool: pg.Pool) {
  return {
    async owns(userId: string, itemId: number) {
      const { rowCount } = await pool.query(
        `SELECT 1 FROM user_collection c JOIN collection_items i ON i.id = c.item_id
         WHERE c.user_id = $1 AND c.item_id = $2 AND i.active`,
        [userId, itemId],
      )
      return Boolean(rowCount)
    },
  }
}
export type CollectionService = ReturnType<typeof createCollectionService>
