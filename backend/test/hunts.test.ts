import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import sharp from 'sharp'
import { isCorrectAnswer } from '../src/answers.js'
import { base, createUser, pool } from './helpers.js'

const MATH = { latitude: 39.895664, longitude: 32.782291 } // inside Matematik
const at = (north: number, accuracy = 10) => ({ latitude: MATH.latitude + north, longitude: MATH.longitude, accuracy })
const INSIDE = at(0)
const OUTSIDE_DOOR = at(0.0007) // about 35 m from the walls
const NEARBY = at(0.001) // about 65 m
const AWAY = at(0.002) // about 180 m
const SECRET = { note: 'Well done, secret note', clue: 'On the third floor', riddle: 'Which hall hosts the event?', answer: 'Cahit Arf' }

const photo = (
  await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#4a7' } })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'home-address-in-exif' } })
    .toBuffer()
).toString('base64')

async function call(path: string, cookie = '', body?: object) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { cookie, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  return { status: response.status, data: (await response.json().catch(() => null)) as any }
}

const student = (name: string) => createUser({ username: name, email: `${name}@metu.edu.tr` })
const hide = (cookie: string, overrides: object = {}) =>
  call('gifts', cookie, { requestId: randomUUID(), ...MATH, ...SECRET, ...overrides })
const search = (cookie: string) => call('hunts', cookie, {})
const checkIn = (cookie: string, id: string, fix: object = INSIDE) => call(`hunts/${id}/location`, cookie, fix)
const solve = (cookie: string, id: string, overrides: object = {}) =>
  call(`hunts/${id}/solve`, cookie, { ...INSIDE, answer: SECRET.answer, photo, ...overrides })
const searchesToday = async (cookie: string) => (await call('student/profile', cookie)).data.searches.today
const one = async (sql: string) => (await pool.query(sql)).rows[0]

async function assigned() {
  const hider = await student('hider')
  const seeker = await student('seeker')
  await hide(hider.cookie)
  const { data } = await search(seeker.cookie)
  return { hider, seeker, id: data.hunt.id as string }
}

async function arrived() {
  const hunt = await assigned()
  await checkIn(hunt.seeker.cookie, hunt.id)
  return hunt
}

test('every hunt endpoint requires a session', async () => {
  const id = randomUUID()
  assert.equal((await call('hunts/current')).status, 401)
  assert.equal((await call(`hunts/${id}/photo`)).status, 401)
  for (const path of ['', `/${id}/location`, `/${id}/solve`, `/${id}/give-up`]) {
    assert.equal((await call(`hunts${path}`, '', {})).status, 401, path)
  }
})

test('a search reveals the main location and nothing else', async () => {
  const hider = await student('hider')
  const seeker = await student('seeker')
  await hide(hider.cookie, { latitude: 39.895664 + 0.0005 })
  const { status, data } = await search(seeker.cookie)
  assert.equal(status, 201)
  assert.equal(data.hunt.location.name, 'Matematik')
  assert.equal(data.hunt.location.fullName, 'Matematik Bölümü')
  assert.equal(data.hunt.clue, null)
  assert.equal(data.hunt.riddle, null)
  const everything = JSON.stringify([data, (await call('hunts/current', seeker.cookie)).data])
  for (const secret of [...Object.values(SECRET), '39.896164', 'item']) assert.ok(!everything.includes(secret), secret)
  assert.equal(await searchesToday(seeker.cookie), 1)
})

test('an empty map does not cost a search, and your own gift is never assigned', async () => {
  const { cookie } = await student('hider')
  await hide(cookie)
  assert.equal((await call('hunts/current', cookie)).data.available, false)
  const { status, data } = await search(cookie)
  assert.equal(status, 409)
  assert.equal(data.error.code, 'NO_GIFTS')
  assert.equal(await searchesToday(cookie), 0)
})

test('searching again returns the same hunt, even in parallel', async () => {
  const hider = await student('hider')
  const seeker = await student('seeker')
  await hide(hider.cookie)
  await hide(hider.cookie)
  const results = await Promise.all(Array.from({ length: 6 }, () => search(seeker.cookie)))
  assert.equal(new Set(results.map((r) => r.data.hunt.id)).size, 1)
  assert.equal(await searchesToday(seeker.cookie), 1)
})

test('one gift never goes to two students at once', async () => {
  const hider = await student('hider')
  const seekers = [await student('one'), await student('two'), await student('three')]
  await hide(hider.cookie)
  const results = await Promise.all(seekers.map((seeker) => search(seeker.cookie)))
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409])
})

test('only two searches a day', async () => {
  const hider = await student('hider')
  const seeker = await student('seeker')
  for (let i = 0; i < 3; i++) await hide(hider.cookie)
  for (let i = 0; i < 2; i++) {
    const { data } = await search(seeker.cookie)
    await call(`hunts/${data.hunt.id}/give-up`, seeker.cookie, {})
  }
  assert.equal((await search(seeker.cookie)).data.error.code, 'DAILY_LIMIT')
})

test('a random gift is drawn from all that are available', async () => {
  const hider = await student('hider')
  for (const [latitude, longitude] of [[39.895664, 32.782291], [39.895745, 32.783203], [39.889585, 32.782536]]) {
    await hide(hider.cookie, { latitude, longitude })
  }
  const names = new Set<string>()
  for (let i = 0; i < 14 && names.size < 2; i++) {
    const seeker = await student(`seeker${i}`)
    const { data } = await search(seeker.cookie)
    names.add(data.hunt.location.name)
    await call(`hunts/${data.hunt.id}/give-up`, seeker.cookie, {})
  }
  assert.ok(names.size >= 2)
})

test('the clue stays locked from far away or with weak GPS', async () => {
  const { seeker, id } = await assigned()
  for (const fix of [AWAY, NEARBY, at(0, 500), at(0.002, 99)]) {
    const { data } = await checkIn(seeker.cookie, id, fix)
    assert.equal(data.hunt.arrived, false)
    assert.equal(data.hunt.clue, null)
  }
})

test('getting close reveals the clue and riddle, which stay after a reload', async () => {
  const { seeker, id } = await assigned()
  const { data } = await checkIn(seeker.cookie, id, OUTSIDE_DOOR)
  assert.equal(data.hunt.clue, SECRET.clue)
  assert.equal(data.hunt.riddle, SECRET.riddle)
  assert.equal((await call('hunts/current', seeker.cookie)).data.hunt.clue, SECRET.clue)
  assert.ok(!JSON.stringify(data).includes(SECRET.answer))
})

test('bad location readings are refused', async () => {
  const { seeker, id } = await assigned()
  for (const fix of [{}, { ...INSIDE, latitude: '39' }, { ...INSIDE, accuracy: -1 }, { ...INSIDE, accuracy: null }]) {
    assert.equal((await checkIn(seeker.cookie, id, fix)).status, 400)
  }
})

test("nobody can act on another student's hunt", async () => {
  const { hider, id } = await assigned()
  for (const { cookie } of [hider, await student('stranger')]) {
    assert.equal((await checkIn(cookie, id)).status, 404)
    assert.equal((await solve(cookie, id)).status, 404)
    assert.equal((await call(`hunts/${id}/give-up`, cookie, {})).status, 404)
  }
})

test('the riddle cannot be solved before arriving', async () => {
  const { seeker, id } = await assigned()
  assert.equal((await solve(seeker.cookie, id)).data.error.code, 'NOT_ARRIVED')
})

test('place and photo problems do not use up an attempt', async () => {
  const { seeker, id } = await arrived()
  const cases = [
    AWAY, at(0, 400), { photo: '' }, { photo: 'bm90IGFuIGltYWdl' }, { answer: '' },
    { photo: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64') },
    { photo: Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2]).toString('base64') },
  ]
  for (const override of cases) assert.ok((await solve(seeker.cookie, id, override)).status >= 400)
  assert.equal((await one('SELECT wrong_answers FROM hunts')).wrong_answers, 0)
})

test('an oversized photo is refused', async () => {
  const { seeker, id } = await arrived()
  assert.equal((await solve(seeker.cookie, id, { photo: 'A'.repeat(4_300_000) })).status, 413)
})

test('solving unlocks the booklet, reveals the note and retires the gift', async () => {
  const { hider, seeker, id } = await arrived()
  const { status, data } = await solve(seeker.cookie, id, { ...NEARBY, answer: 'cahit arf konferans salonu' })
  assert.equal(status, 200)
  assert.equal(data.note, SECRET.note)

  const unlocked = (await call('student/profile', seeker.cookie)).data.items.filter((item: any) => item.foundAt)
  assert.equal(unlocked.length, 1)
  assert.equal(unlocked[0].id, data.item.id)
  assert.equal(unlocked[0].name, data.item.name)

  assert.ok((await call('gifts/mine', hider.cookie)).data.gifts[0].foundAt)
  assert.equal((await search((await student('late')).cookie)).data.error.code, 'NO_GIFTS')
})

test('a retried or parallel solve rewards once', async () => {
  const { seeker, id } = await arrived()
  const results = await Promise.all([solve(seeker.cookie, id), solve(seeker.cookie, id), solve(seeker.cookie, id)])
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200])
  assert.equal(new Set(results.map((r) => r.data.item.id)).size, 1)
  assert.equal((await one('SELECT count(*)::int AS n FROM user_collection')).n, 1)
})

test('a find never repeats a sticker while any are locked', async () => {
  const { seeker, id } = await arrived()
  await pool.query('INSERT INTO user_collection (user_id, item_id) SELECT $1, id FROM collection_items WHERE id <> 17', [seeker.data.user.id])
  assert.equal((await solve(seeker.cookie, id)).data.item.id, 17)
})

test('five wrong answers end the hunt, even when sent together', async () => {
  const { seeker, id } = await arrived()
  const results = await Promise.all(Array.from({ length: 9 }, () => solve(seeker.cookie, id, { answer: 'MM-25' })))
  const codes = results.map((r) => r.data.error.code)
  assert.equal(codes.filter((code) => code === 'WRONG_ANSWER').length, 4)
  assert.equal(codes.filter((code) => code === 'HUNT_FAILED').length, 1)
  assert.equal((await solve(seeker.cookie, id)).data.error.code, 'HUNT_ENDED')
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')
})

test('giving up frees the gift for others only', async () => {
  const { seeker, id } = await assigned()
  assert.equal((await call(`hunts/${id}/give-up`, seeker.cookie, {})).status, 204)
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')
  assert.equal((await search((await student('other')).cookie)).status, 201)
})

test('after 24 hours the gift returns to the pool', async () => {
  const { seeker, id } = await arrived()
  await pool.query("UPDATE hunts SET expires_at = now() - interval '1 second'")
  assert.equal((await solve(seeker.cookie, id)).data.error.code, 'HUNT_ENDED')
  assert.equal((await call('hunts/current', seeker.cookie)).data.hunt, null)
  assert.equal((await search((await student('other')).cookie)).status, 201)
})

test('closing a building releases its hunts and gifts', async () => {
  const { seeker } = await assigned()
  await pool.query("UPDATE gifts SET location_key = 'way/closed'")
  const { data } = await call('hunts/current', seeker.cookie)
  assert.equal(data.hunt, null)
  assert.equal(data.available, false)
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')
})

test('the photo is resized, stripped of EXIF and private', async () => {
  const { hider, seeker, id } = await arrived()
  await solve(seeker.cookie, id)
  const url = (await call('gifts/mine', hider.cookie)).data.gifts[0].photoUrl.replace('/api/', '')

  for (const { cookie } of [hider, seeker]) {
    const response = await fetch(base + url, { headers: { cookie } })
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    const stored = Buffer.from(await response.arrayBuffer())
    assert.ok(!stored.includes('home-address-in-exif'))
    const meta = await sharp(stored).metadata()
    assert.equal(meta.exif, undefined)
    assert.equal(meta.width, 1600)
  }
  assert.equal((await call(url, (await student('stranger')).cookie)).status, 404)
})

test('positions are never stored', async () => {
  await arrived()
  const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'hunts'")
  assert.ok(!rows.some((row) => /lat|lon|accuracy/.test(row.column_name)))
})

test('an older gift joins the hunt once its hider adds a riddle', async () => {
  const hider = await student('hider')
  const seeker = await student('seeker')
  const { data } = await hide(hider.cookie)
  await pool.query('UPDATE gifts SET location_key = NULL, location_name = NULL, clue = NULL, riddle = NULL, answers = NULL')
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')

  const path = `gifts/${data.gift.id}/puzzle`
  assert.equal((await call(path, seeker.cookie, SECRET)).status, 404)
  assert.equal((await call(path, hider.cookie, SECRET)).status, 200)
  assert.equal((await call(path, hider.cookie, SECRET)).data.error.code, 'ALREADY_SET')
  assert.equal((await search(seeker.cookie)).status, 201)
})

const right: [string, string][] = [
  ['Cahit Arf Conference Hall', 'Cahit Arf'],
  ['cahit arf konferans salonu', 'Cahit Arf Conference Hall'],
  ['CAHİT ARF', 'Cahit Arf'],
  ['cahitarf', 'Cahit Arf'],
  ['Cahit Aref', 'Cahit Arf'],
  ['MM 25', 'MM-25 Amfisi'],
  ['uclu amfi', 'Üçlü Amfi'],
  ['ISIK', 'ışık'],
]
for (const [guess, answer] of right) test(`answer accepted: ${guess}`, () => assert.ok(isCorrectAnswer(guess, [answer])))

const wrong: [string, string][] = [
  ['Amfi 4', 'Amfi 3'],
  ['MM-26', 'MM-25'],
  ['Mimarlık Amfi 12', 'Mimarlık Amfi 13'],
  ['Kimya Blok B', 'Kimya Blok A'],
  ['conference hall', 'Cahit Arf Conference Hall'],
  ['Cahit', 'Cahit Arf'],
  ['!!!', 'Cahit Arf'],
]
for (const [guess, answer] of wrong) test(`answer refused: ${guess}`, () => assert.ok(!isCorrectAnswer(guess, [answer])))

test('any accepted alternative works', () => assert.ok(isCorrectAnswer('arf hall', ['Cahit Arf', 'Arf Hall'])))
