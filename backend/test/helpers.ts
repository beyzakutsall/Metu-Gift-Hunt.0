import { randomBytes } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach } from 'node:test'
import pg from 'pg'
import { createApp } from '../src/app.js'
import { createPool, migrate } from '../src/database.js'
import type { Mail } from '../src/mailer.js'

// Uses a randomly named database and drops only that one afterwards.
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? 'postgresql://localhost:5432/postgres'
const database = `campus_quest_test_${randomBytes(6).toString('hex')}`
export const appUrl = 'http://localhost:5173'
export const password = 'correct horse battery'

export let pool: pg.Pool
let admin: pg.Client
let server: Server
export let base: string
export let outbox: Mail[]

before(async () => {
  admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${database}`)
  const url = new URL(adminUrl)
  url.pathname = `/${database}`
  pool = createPool(url.toString())
  await migrate(pool)
})

beforeEach(async () => {
  server?.closeAllConnections()
  server?.close()
  await pool.query('TRUNCATE users, pending_registrations, sessions, password_resets CASCADE')
  outbox = []
  // A fresh app per test also means fresh rate limits.
  const { app } = createApp({
    pool,
    appUrl,
    secureCookies: false,
    trustProxy: 0,
    mailer: { delivery: 'console', send: async (mail) => void outbox.push(mail) },
  })
  await new Promise<void>((resolve) => (server = app.listen(0, '127.0.0.1', () => resolve())))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/`
})

after(async () => {
  server?.closeAllConnections()
  server?.close()
  await pool.end()
  await admin.query(`DROP DATABASE ${database}`)
  await admin.end()
})

export async function post(path: string, body: object, headers: Record<string, string> = {}) {
  const response = await fetch(`${base}auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const setCookie = response.headers.get('set-cookie') ?? ''
  const data: any = await response.json().catch(() => null)
  return { status: response.status, data, setCookie, cookie: setCookie.split(';')[0]! }
}

export const register = (overrides: object = {}) =>
  post('register', { username: 'explorer', email: 'e123456@metu.edu.tr', password, acceptTerms: true, ...overrides })

export const lastToken = () => /#token=([\w-]+)/.exec(outbox.at(-1)!.text)![1]!

export async function createUser(overrides: object = {}) {
  await register(overrides)
  return post('verify-email', { token: lastToken(), password })
}

export const clearOutbox = () => void outbox.splice(0)
