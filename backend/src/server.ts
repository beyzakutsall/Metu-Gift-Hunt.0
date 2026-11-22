import { createApp } from './app.js'
import { config } from './config.js'
import { createPool, migrate } from './database.js'
import { createMailer } from './mailer.js'

const pool = createPool(config.databaseUrl)
try {
  await migrate(pool)
} catch (error) {
  console.error('Database is not ready. Is PostgreSQL running, and did you run "npm run db:setup"?')
  throw error
}

const mailer = createMailer()
const { app, auth } = createApp({
  pool,
  mailer,
  appUrl: config.appUrl,
  secureCookies: config.production,
  trustProxy: config.trustProxy,
})

const cleanUp = () => auth.deleteExpired().catch((error) => console.error('Cleanup failed:', error.message))
await cleanUp()
setInterval(cleanUp, 60 * 60_000).unref()

const server = app.listen(config.port, '127.0.0.1', (error) => {
  if (error) throw error
  console.log(`API on http://127.0.0.1:${config.port} (email: ${mailer.delivery})`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)))
    server.closeAllConnections()
  })
}
