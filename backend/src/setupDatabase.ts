import pg from 'pg'
import { config } from './config.js'
import { createPool, migrate } from './database.js'

// Creates the database if it is missing, then applies new migrations. Never drops anything.
const url = new URL(config.databaseUrl)
const name = decodeURIComponent(url.pathname.slice(1))
url.pathname = '/postgres'

const admin = new pg.Client({ connectionString: url.toString() })
await admin.connect()
try {
  if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount) {
    await admin.query(`CREATE DATABASE ${admin.escapeIdentifier(name)}`)
    console.log(`Created database ${name}`)
  }
} finally {
  await admin.end()
}

const pool = createPool(config.databaseUrl)
try {
  await migrate(pool)
  console.log(`Database ${name} is ready`)
} finally {
  await pool.end()
}
