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

test('registering creates the account and signs in, with no email', async () => {
  const result = await register({ email: ' E123456@METU.EDU.TR ' })
  assert.equal(result.status, 201)
  assert.deepEqual(Object.keys(result.data.user).sort(), ['email', 'id', 'username'])
  assert.equal(result.data.user.email, 'e123456@metu.edu.tr')
  assert.match(result.setCookie, /HttpOnly/)
  assert.match(result.setCookie, /SameSite=Lax/)
  assert.doesNotMatch(result.setCookie, /Max-Age/)
  assert.equal((await sessionUser(result.cookie)).username, 'explorer')
  assert.equal((await login()).status, 200)
  assert.equal(outbox.length, 0)
})

test('no plaintext password or session token is stored', async () => {
  const { cookie } = await register()
  const rows = JSON.stringify([
    (await pool.query('SELECT * FROM users')).rows,
    (await pool.query('SELECT * FROM sessions')).rows,
  ])
  assert.ok(!rows.includes(password))
  assert.ok(!rows.includes(cookie.split('=')[1]!))
})

test('the verification endpoints are gone', async () => {
  for (const path of ['verify-email', 'resend-verification']) assert.equal((await post(path, {})).status, 404)
})

test('wrong password and unknown email look identical', async () => {
  await createUser()
  const wrong = await login({ password: 'wrong password' })
  const unknown = await login({ email: 'nobody@metu.edu.tr' })
  assert.equal(wrong.status, 401)
  assert.deepEqual(wrong.data, unknown.data)
})

test('an existing email is refused and left untouched', async () => {
  await createUser()
  const again = await register({ username: 'someone_else', email: 'E123456@metu.edu.tr', password: 'attacker password' })
  assert.equal(again.status, 409)
  assert.equal(again.data.error.code, 'EMAIL_TAKEN')
  assert.equal(again.data.error.field, 'email')
  assert.equal(again.setCookie, '')
  assert.equal((await login()).status, 200)
  assert.equal((await login({ password: 'attacker password' })).status, 401)
})

test('usernames are unique regardless of case', async () => {
  await register({ email: 'first@metu.edu.tr' })
  const second = await register({ username: 'EXPLORER', email: 'second@metu.edu.tr' })
  assert.equal(second.status, 409)
  assert.equal(second.data.error.field, 'username')
})

test('simultaneous registrations create one account', async () => {
  const results = await Promise.all([1, 2, 3, 4].map((n) => register({ username: `student_${n}` })))
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409, 409, 409])
  assert.equal((await pool.query('SELECT 1 FROM users')).rowCount, 1)
  assert.equal((await pool.query('SELECT 1 FROM sessions')).rowCount, 1)
})

test('cross-origin registration is refused', async () => {
  const body = { username: 'explorer', email: 'e123456@metu.edu.tr', password, acceptTerms: true }
  assert.equal((await post('register', body, { origin: 'https://evil.example' })).status, 403)
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

test('login guessing, registering and reset emails are rate limited', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login({ password: 'wrong password' })).status, 401)
  assert.equal((await login({ password: 'wrong password' })).status, 429)
  for (let i = 0; i < 20; i++) assert.notEqual((await register()).status, 429)
  assert.equal((await register()).status, 429)
  const forgot = () => post('forgot-password', { email: 'e123456@metu.edu.tr' })
  for (let i = 0; i < 5; i++) assert.equal((await forgot()).status, 202)
  assert.equal((await forgot()).status, 429)
})
