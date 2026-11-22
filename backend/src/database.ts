import { readdir, readFile } from 'node:fs/promises'
import { userInfo } from 'node:os'
import pg from 'pg'

// Match psql: fall back to the OS user when the URL names none.
pg.defaults.user ||= userInfo().username

export function createPool(connectionString: string) {
  const pool = new pg.Pool({ connectionString })
  pool.on('error', (error) => console.error('Idle database connection failed:', error.message))
  return pool
}

export async function transaction<T>(pool: pg.Pool, work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const result = await work(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

export async function migrate(pool: pg.Pool) {
  const directory = new URL('../migrations/', import.meta.url)
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()

  await transaction(pool, async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('campus_quest_migrations'))")
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())')
    for (const file of files) {
      if ((await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])).rowCount) continue
      await db.query(await readFile(new URL(file, directory), 'utf8'))
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      console.log(`Applied migration ${file}`)
    }
  })
}
