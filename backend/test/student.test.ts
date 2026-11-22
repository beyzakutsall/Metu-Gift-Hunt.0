import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DAILY_LIMITS } from '../../shared/gameRules.js'
import { base, createUser, pool, post } from './helpers.js'

async function getProfile(cookie = '', query = '') {
  const response = await fetch(`${base}student/profile${query}`, { headers: { cookie } })
  return { status: response.status, cache: response.headers.get('cache-control'), data: (await response.json()) as any }
}

const act = (userId: string, kind: string, slot: number, daysAgo = 0) =>
  pool.query(
    `INSERT INTO gift_actions (user_id, kind, slot, day)
     VALUES ($1, $2, $3, (now() AT TIME ZONE 'Europe/Istanbul')::date - $4::int)`,
    [userId, kind, slot, daysAgo],
  )

test('the profile requires a session', async () => {
  assert.equal((await getProfile()).status, 401)
  assert.equal((await getProfile('cq_session=forged')).status, 401)
  const { cookie } = await createUser()
  await post('logout', {}, { cookie })
  assert.equal((await getProfile(cookie)).status, 401)
})

test('a new student has 18 locked items and no activity', async () => {
  const { cookie } = await createUser()
  const { data, cache } = await getProfile(cookie)
  assert.equal(cache, 'no-store')
  assert.deepEqual(data.searches, { today: 0, limit: 2, total: 0 })
  assert.deepEqual(data.hides, { today: 0, limit: 3, total: 0 })
  assert.equal(data.items.length, 18)
  assert.ok(data.items.every((item: any) => item.foundAt === null))
})

test('locked items never reveal a name, model or credit', async () => {
  const { cookie } = await createUser()
  const body = JSON.stringify((await getProfile(cookie)).data)
  for (const { name, credit } of (await pool.query('SELECT name, credit FROM collection_items WHERE active')).rows) {
    for (const secret of [name, credit.title, credit.author, credit.source]) assert.ok(!body.includes(secret), secret)
  }
})

test('finding an item unlocks only that item', async () => {
  const { cookie, data } = await createUser()
  await pool.query('INSERT INTO user_collection (user_id, item_id) VALUES ($1, 3)', [data.user.id])
  const found = (await getProfile(cookie)).data.items.filter((item: any) => item.foundAt)
  assert.equal(found.length, 1)
  assert.equal(found[0].name, 'Sweetheart Cat')
  assert.equal(found[0].credit.author, 'Sabrina Zakir')
})

test('today and all-time counts are separate', async () => {
  const { cookie, data } = await createUser()
  const id = data.user.id
  await act(id, 'search', 1)
  await act(id, 'search', 1, 1)
  await act(id, 'search', 2, 1)
  await act(id, 'hide', 1)
  await act(id, 'hide', 2)
  await act(id, 'hide', 1, 9)
  const profile = (await getProfile(cookie)).data
  assert.deepEqual(profile.searches, { today: 1, limit: 2, total: 3 })
  assert.deepEqual(profile.hides, { today: 2, limit: 3, total: 3 })
})

test('students only ever see their own progress', async () => {
  const first = await createUser()
  const second = await createUser({ username: 'other', email: 'other@metu.edu.tr' })
  await act(first.data.user.id, 'hide', 1)
  await pool.query('INSERT INTO user_collection (user_id, item_id) VALUES ($1, 1)', [first.data.user.id])
  const seen = (await getProfile(second.cookie, `?userId=${first.data.user.id}`)).data
  assert.equal(seen.hides.total, 0)
  assert.ok(seen.items.every((item: any) => item.foundAt === null))
})

test('the database enforces exactly the shared daily limits', async () => {
  const { data } = await createUser()
  const id = data.user.id
  for (const [kind, limit] of Object.entries(DAILY_LIMITS)) {
    for (let slot = 1; slot <= limit; slot++) await act(id, kind, slot)
    await assert.rejects(act(id, kind, limit + 1), /gift_actions_daily_limit/)
    await assert.rejects(act(id, kind, 1), /duplicate key/)
  }
  await assert.rejects(act(id, 'other', 1), /gift_actions_daily_limit/)
})

test('limits reset at the next midnight in Ankara', async () => {
  const { cookie } = await createUser()
  const resets = new Date((await getProfile(cookie)).data.resetsAt)
  assert.equal(resets.getUTCHours(), 21) // 00:00 at UTC+3
  assert.equal(resets.getUTCMinutes(), 0)
  const wait = resets.getTime() - Date.now()
  assert.ok(wait > 0 && wait <= 86_400_000)
})

test('the default day of an action is the campus day', async () => {
  const { cookie, data } = await createUser()
  await pool.query("INSERT INTO gift_actions (user_id, kind, slot) VALUES ($1, 'search', 1)", [data.user.id])
  assert.equal((await getProfile(cookie)).data.searches.today, 1)
})
