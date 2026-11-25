import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const { env } = process
const production = env.NODE_ENV === 'production'

if (production) {
  for (const key of ['DATABASE_URL', 'APP_URL', 'SMTP_URL', 'MAIL_FROM']) {
    if (!env[key]) throw new Error(`${key} is required in production`)
  }
  if (!env.APP_URL?.startsWith('https://')) throw new Error('APP_URL must use https in production')
}

export const config = {
  production,
  port: Number(env.PORT || 4000),
  databaseUrl: env.DATABASE_URL || 'postgresql://localhost:5432/campus_quest',
  appUrl: new URL(env.APP_URL || 'http://localhost:5173').origin,
  smtpUrl: env.SMTP_URL || '',
  mailFrom: env.MAIL_FROM || 'METU Gift Hunt <no-reply@example.com>',
  trustProxy: Number(env.TRUST_PROXY || 0),
}
