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
  frontendDir: config.frontendDir,
})

const cleanUp = () => auth.deleteExpired().catch((error) => console.error('Cleanup failed:', error.message))
await cleanUp()
setInterval(cleanUp, 60 * 60_000).unref()

// Local only by default. A host such as Render sets HOST=0.0.0.0 to reach its own proxy.
const server = app.listen(config.port, config.host, (error) => {
  if (error) throw error
  console.log(`API on http://${config.host}:${config.port} (email: ${mailer.delivery}${config.frontendDir ? ', serving the frontend' : ''})`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)))
    server.closeAllConnections()
  })
}
