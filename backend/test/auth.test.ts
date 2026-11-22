import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emailError } from '../../shared/authRules.js'
import { appUrl, base, clearOutbox, createUser, lastToken, outbox, password, pool, post, register } from './helpers.js'

const login = (overrides: object = {}) => post('login', { email: 'e123456@metu.edu.tr', password, ...overrides })
const sessionUser = async (cookie: string) =>
  ((await (await fetch(`${base}auth/session`, { headers: { cookie } })).json()) as any).user

test('email rule accepts only the exact METU domain', () => {
  for (const good of ['e123456@metu.edu.tr', 'Ad.Soyad@METU.EDU.TR', ' a_b-c@metu.edu.tr ']) {
    assert.equal(emailError(good), undefined, good)
  }
  const bad = [
    '', 'a', 'a@gmail.com', 'a@fakemetu.edu.tr', 'a@ceng.metu.edu.tr', 'a@metu.edu.tr.evil.com', 'a+b@metu.edu.tr',
    'a@b@metu.edu.tr', '.a@metu.edu.tr', 'a@metu.edu.tr,x@evil.com', 'a@metu.edu.tr\nb@metu.edu.tr', 'K@metu.edu.tr',
  ]
  for (const value of bad) assert.ok(emailError(value), value)
})

test('registration validates every field on the server', async () => {
  const cases: [object, string][] = [
    [{ username: 'x' }, 'username'],
    [{ username: 'has space' }, 'username'],
    [{ email: 'a@gmail.com' }, 'email'],
    [{ email: ['a@metu.edu.tr'] }, 'email'],
    [{ password: 'short' }, 'password'],
    [{ password: ' '.repeat(12) }, 'password'],
    [{ acceptTerms: 'true' }, 'acceptTerms'],
  ]
  for (const [override, field] of cases) {
    const result = await register(override)
    assert.equal(result.status, 400)
    assert.equal(result.data.error.field, field)
  }
  assert.equal(outbox.length, 0)
})

test('register, verify, and get a session', async () => {
  assert.equal((await register({ email: 'E123456@METU.EDU.TR' })).status, 202)
  assert.equal((await pool.query('SELECT 1 FROM users')).rowCount, 0)

  const verified = await post('verify-email', { token: lastToken(), password })
  assert.equal(verified.status, 200)
  assert.equal(verified.data.user.email, 'e123456@metu.edu.tr')
  assert.match(verified.setCookie, /HttpOnly/)
  assert.match(verified.setCookie, /SameSite=Lax/)
  assert.equal((await sessionUser(verified.cookie)).username, 'explorer')
})

test('no plaintext password or token is stored', async () => {
  await register()
  const row = JSON.stringify((await pool.query('SELECT * FROM pending_registrations')).rows)
  assert.ok(!row.includes(password))
  assert.ok(!row.includes(lastToken()))
})

test('a link alone cannot activate an account registered by someone else', async () => {
  await register({ password: 'attacker password' })
  const result = await post('verify-email', { token: lastToken(), password })
  assert.equal(result.data.error.code, 'WRONG_PASSWORD')
  assert.equal((await pool.query('SELECT 1 FROM users')).rowCount, 0)
})

test('verification links work once and expire', async () => {
  await register()
  const token = lastToken()
  await pool.query("UPDATE pending_registrations SET expires_at = now() - interval '1 second'")
  assert.equal((await post('verify-email', { token, password })).status, 400)
  await pool.query("UPDATE pending_registrations SET expires_at = now() + interval '1 hour'")
  assert.equal((await post('verify-email', { token, password })).status, 200)
  assert.equal((await post('verify-email', { token, password })).status, 400)
})

test('two simultaneous verifications create one user', async () => {
  await register()
  const token = lastToken()
  const results = await Promise.all([1, 2].map(() => post('verify-email', { token, password })))
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 400])
})

test('resending replaces the old link', async () => {
  const { data } = await register()
  const old = lastToken()
  assert.equal((await post('resend-verification', { registrationId: data.registrationId })).status, 202)
  assert.equal((await post('verify-email', { token: old, password })).status, 400)
  assert.equal((await post('verify-email', { token: lastToken(), password })).status, 200)
})

test('unverified login is explained only to someone with the password', async () => {
  const { data } = await register()
  const right = await login()
  assert.equal(right.status, 403)
  assert.equal(right.data.error.registrationId, data.registrationId)
  assert.equal((await login({ password: 'wrong password' })).status, 401)
})

test('wrong password and unknown email look identical', async () => {
  await createUser()
  const wrong = await login({ password: 'wrong password' })
  const unknown = await login({ email: 'nobody@metu.edu.tr' })
  assert.equal(wrong.status, 401)
  assert.deepEqual(wrong.data, unknown.data)
})

test('registering an existing email does not reveal the account', async () => {
  await createUser()
  const existing = await register({ username: 'someone_else' })
  const fresh = await register({ username: 'newcomer', email: 'new@metu.edu.tr' })
  assert.equal(existing.status, fresh.status)
  assert.deepEqual(Object.keys(existing.data).sort(), Object.keys(fresh.data).sort())
  assert.match(outbox.at(-2)!.subject, /already have/)
})

test('usernames are unique regardless of case', async () => {
  await register({ email: 'first@metu.edu.tr' })
  const first = lastToken()
  await register({ username: 'EXPLORER', email: 'second@metu.edu.tr' })
  const second = lastToken()
  assert.equal((await post('verify-email', { token: first, password })).status, 200)
  assert.equal((await post('verify-email', { token: second, password })).status, 409)
  assert.equal((await register({ username: 'Explorer', email: 'third@metu.edu.tr' })).data.error.field, 'username')
})

test('remember me controls how long the cookie lasts', async () => {
  await createUser()
  assert.doesNotMatch((await login()).setCookie, /Max-Age/)
  assert.match((await login({ remember: true })).setCookie, /Max-Age=2592000/)
})

test('logout and expiry both end a session', async () => {
  const { cookie } = await createUser()
  assert.equal((await post('logout', {}, { cookie })).status, 204)
  assert.equal(await sessionUser(cookie), null)
  const next = await login()
  await pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'")
  assert.equal(await sessionUser(next.cookie), null)
})

test('password reset is single use and revokes every session', async () => {
  const { cookie } = await createUser()
  await post('forgot-password', { email: 'e123456@metu.edu.tr' })
  const token = lastToken()
  assert.equal((await post('reset-password', { token, password: 'a brand new password' })).status, 204)
  assert.equal(await sessionUser(cookie), null)
  assert.equal((await post('reset-password', { token, password: 'yet another password' })).status, 400)
  assert.equal((await login()).status, 401)
  assert.equal((await login({ password: 'a brand new password' })).status, 200)
})

test('expired reset links are rejected', async () => {
  await createUser()
  await post('forgot-password', { email: 'e123456@metu.edu.tr' })
  await pool.query("UPDATE password_resets SET expires_at = now() - interval '1 second'")
  assert.equal((await post('reset-password', { token: lastToken(), password: 'a brand new password' })).status, 400)
})

test('forgot password looks identical for unknown emails', async () => {
  await createUser()
  clearOutbox()
  const known = await post('forgot-password', { email: 'e123456@metu.edu.tr' })
  const unknown = await post('forgot-password', { email: 'nobody@metu.edu.tr' })
  assert.deepEqual(known.data, unknown.data)
  assert.equal(outbox.length, 1)
})

test('cross-origin and non-JSON writes are refused', async () => {
  assert.equal((await post('logout', {}, { origin: 'https://evil.example' })).status, 403)
  assert.equal((await post('logout', {}, { 'content-type': 'text/plain' })).status, 415)
  assert.equal((await post('logout', {}, { origin: appUrl })).status, 204)
})

test('login guessing and email flooding are rate limited', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login({ password: 'wrong password' })).status, 401)
  assert.equal((await login({ password: 'wrong password' })).status, 429)
  for (let i = 0; i < 5; i++) assert.equal((await register()).status, 202)
  assert.equal((await register()).status, 429)
})
