import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const { env } = process
const production = env.NODE_ENV === 'production'
const frontendDir = fileURLToPath(new URL('../../frontend/dist/', import.meta.url))

if (production) {
  for (const key of ['DATABASE_URL', 'APP_URL', 'MAIL_FROM']) {
    if (!env[key]) throw new Error(`${key} is required in production`)
  }
  // localhost is for trying a production build on this machine: http, and emails in the terminal, are fine there.
  const local = new URL(env.APP_URL!).hostname === 'localhost'
  if (!local && !env.APP_URL!.startsWith('https://')) throw new Error('APP_URL must use https in production')
  if (!local && !env.SMTP_URL && !env.BREVO_API_KEY) throw new Error('SMTP_URL or BREVO_API_KEY is required in production')
  if (!existsSync(`${frontendDir}index.html`)) throw new Error('frontend/dist is missing: run "npm run build" first')
}

export const config = {
  production,
  host: env.HOST || '127.0.0.1',
  port: Number(env.PORT || 4000),
  databaseUrl: env.DATABASE_URL || 'postgresql://localhost:5432/campus_quest',
  appUrl: new URL(env.APP_URL || 'http://localhost:5173').origin,
  smtpUrl: env.SMTP_URL || '',
  brevoApiKey: env.BREVO_API_KEY || '',
  mailFrom: env.MAIL_FROM || 'METU Gift Hunt <no-reply@example.com>',
  trustProxy: Number(env.TRUST_PROXY || 0),
  // In development Vite serves the frontend and proxies /api.
  frontendDir: production ? frontendDir : undefined,
}
