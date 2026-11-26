import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import sharp from 'sharp'
import { isCorrectAnswer } from '../src/answers.js'
import { base, createUser, later, pool } from './helpers.js'
import { finderPhoto, hiderPhotos } from './images.js'

const MATH = { latitude: 39.895664, longitude: 32.782291 } // inside Matematik
const at = (north: number, accuracy = 10) => ({ latitude: MATH.latitude + north, longitude: MATH.longitude, accuracy })
const INSIDE = at(0)
const OUTSIDE_DOOR = at(0.0007) // about 35 m from the walls
const NEARBY = at(0.001) // about 65 m
const AWAY = at(0.002) // about 180 m
const SECRET = {
  note: 'Well done, secret note', clue: 'Next to the noticeboard', riddle: 'Which hall hosts the event?', answer: 'Cahit Arf', floor: '3rd floor',
}

const SPOT = (await hiderPhotos(1)).map((photo) => photo.toString('base64'))
// What the finder's camera sees at that spot, and at a different one. EXIF must never survive.
const HERE = (await sharp(await finderPhoto(1)).withExif({ IFD0: { Copyright: 'home-address-in-exif' } }).jpeg().toBuffer()).toString('base64')
const ELSEWHERE = (await finderPhoto(2)).toString('base64')

async function call(path: string, cookie = '', body?: object) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { cookie, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  return { status: response.status, data: (await response.json().catch(() => null)) as any }
}

const student = (name: string) => createUser({ username: name, email: `${name}@metu.edu.tr` })
function hide(cookie: string, overrides: Record<string, unknown> = {}) {
  const place = { ...MATH, ...overrides }
  const location = { latitude: place.latitude, longitude: place.longitude, accuracy: 10 }
  return call('gifts', cookie, { requestId: randomUUID(), ...MATH, ...SECRET, location, photos: SPOT, ...overrides })
}
const search = (cookie: string) => call('hunts', cookie, {})
const checkIn = (cookie: string, id: string, fix: object = INSIDE) => call(`hunts/${id}/location`, cookie, fix)
const solve = (cookie: string, id: string, overrides: object = {}) =>
  call(`hunts/${id}/solve`, cookie, { ...INSIDE, answer: SECRET.answer, ...overrides })
const frame = (cookie: string, id: string, image = HERE, fix: object = INSIDE) => call(`hunts/${id}/frame`, cookie, { ...fix, frame: image })
/** Time has passed since arriving, so a find is believable. */
const settle = () => pool.query("UPDATE hunts SET arrived_at = now() - interval '1 minute' WHERE arrived_at IS NOT NULL")
/** The camera has had its fair try, so the riddle is open. */
const cameraTried = () => pool.query('UPDATE hunts SET frames_tried = 20')
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
  await settle()
  return hunt
}

/** Arrived, and the camera didn't recognise the place, so it's down to the riddle. */
async function atRiddle() {
  const hunt = await arrived()
  await cameraTried()
  return hunt
}

test('every hunt endpoint requires a session', async () => {
  const id = randomUUID()
  assert.equal((await call('hunts/current')).status, 401)
  assert.equal((await call(`hunts/${id}/photo`)).status, 401)
  for (const path of ['', `/${id}/location`, `/${id}/frame`, `/${id}/solve`, `/${id}/give-up`]) {
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
    later(10 * 60) // walking between buildings
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
    later(60)
    const { data } = await checkIn(seeker.cookie, id, fix)
    assert.equal(data.hunt.arrived, false)
    assert.equal(data.hunt.clue, null)
  }
})

test('getting close reveals the floor, clue and riddle, which stay after a reload', async () => {
  const { seeker, id } = await assigned()
  const { data } = await checkIn(seeker.cookie, id, OUTSIDE_DOOR)
  assert.equal(data.hunt.floor, SECRET.floor)
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
    assert.equal((await frame(cookie, id)).status, 404)
    assert.equal((await solve(cookie, id)).status, 404)
    assert.equal((await call(`hunts/${id}/give-up`, cookie, {})).status, 404)
  }
})

test('the camera and the riddle need arriving first', async () => {
  const { seeker, id } = await assigned()
  assert.equal((await frame(seeker.cookie, id)).data.error.code, 'NOT_ARRIVED')
  assert.equal((await solve(seeker.cookie, id)).data.error.code, 'NOT_ARRIVED')
})

test('the camera finds the gift after frames in a row show the spot', async () => {
  const { hider, seeker, id } = await arrived()
  const first = await frame(seeker.cookie, id)
  assert.equal(first.status, 200)
  // Only how close: no score, no spot photos, nothing about the gift.
  assert.deepEqual(first.data, { found: null, matched: true, streak: 1, needed: 2, framesTried: 1 })
  const second = await frame(seeker.cookie, id)
  assert.equal(second.data.found.note, SECRET.note)
  assert.ok(second.data.found.item.id >= 1)
  assert.ok((await call('gifts/mine', hider.cookie)).data.gifts[0].foundAt)
  // A retried frame after a lost response gets the same reward.
  assert.equal((await frame(seeker.cookie, id)).data.found.item.id, second.data.found.item.id)
})

test('a different place never matches, and a miss resets the streak', async () => {
  const { seeker, id } = await arrived()
  assert.equal((await frame(seeker.cookie, id, ELSEWHERE)).data.matched, false)
  assert.equal((await frame(seeker.cookie, id)).data.streak, 1)
  assert.equal((await frame(seeker.cookie, id, ELSEWHERE)).data.streak, 0)
  assert.equal((await frame(seeker.cookie, id)).data.streak, 1)
  assert.equal((await one('SELECT status FROM hunts')).status, 'active')
})

test('right after arriving, matches wait until a find is believable', async () => {
  const { seeker, id } = await assigned()
  await checkIn(seeker.cookie, id)
  await frame(seeker.cookie, id)
  assert.equal((await frame(seeker.cookie, id)).data.found, null)
  await settle()
  assert.ok((await frame(seeker.cookie, id)).data.found)
})

test('the riddle opens only after the camera has had a fair try', async () => {
  const { seeker, id } = await arrived()
  assert.equal((await solve(seeker.cookie, id)).data.error.code, 'CAMERA_FIRST')
  for (let i = 0; i < 20; i++) await frame(seeker.cookie, id, ELSEWHERE)
  const { data } = await call('hunts/current', seeker.cookie)
  assert.equal(data.hunt.framesTried, 20)
  assert.equal((await solve(seeker.cookie, id)).status, 200)
})

test('place and image problems never use up an attempt or a frame', async () => {
  const { seeker, id } = await atRiddle()
  for (const override of [at(0, 400), { answer: '' }, { latitude: 'x' }]) {
    assert.ok((await solve(seeker.cookie, id, override)).status >= 400, JSON.stringify(override))
  }
  later(60)
  assert.equal((await solve(seeker.cookie, id, AWAY)).data.error.code, 'TOO_FAR')
  const images = ['', 'bm90IGFuIGltYWdl', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),
    Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2]).toString('base64')]
  for (const image of images) assert.equal((await frame(seeker.cookie, id, image)).status, 400)
  const hunt = await one('SELECT wrong_answers, frames_tried FROM hunts')
  assert.deepEqual(hunt, { wrong_answers: 0, frames_tried: 20 })
})

test('an oversized frame is refused', async () => {
  const { seeker, id } = await arrived()
  assert.equal((await frame(seeker.cookie, id, 'A'.repeat(700_000))).status, 413)
})

test('jumping across campus or an unreal reading is refused', async () => {
  const { seeker, id } = await assigned()
  await checkIn(seeker.cookie, id, AWAY)
  const jump = await checkIn(seeker.cookie, id, INSIDE)
  assert.equal(jump.data.error.code, 'TOO_FAST')
  assert.equal((await call('hunts/current', seeker.cookie)).data.hunt.arrived, false)
  assert.equal((await checkIn(seeker.cookie, id, at(0, 0))).data.error.code, 'SUSPICIOUS_GPS')
  later(30)
  assert.equal((await checkIn(seeker.cookie, id, INSIDE)).data.hunt.arrived, true)
})

test('solving the riddle unlocks the booklet, reveals the note and retires the gift', async () => {
  const { hider, seeker, id } = await atRiddle()
  later(30)
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
  const { seeker, id } = await atRiddle()
  const results = await Promise.all([solve(seeker.cookie, id), solve(seeker.cookie, id), solve(seeker.cookie, id)])
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200])
  assert.equal(new Set(results.map((r) => r.data.item.id)).size, 1)
  assert.equal((await one('SELECT count(*)::int AS n FROM user_collection')).n, 1)
})

test('a find never repeats a collectible while any are locked', async () => {
  const { seeker, id } = await atRiddle()
  await pool.query('INSERT INTO user_collection (user_id, item_id) SELECT $1, id FROM collection_items WHERE id <> 16', [seeker.data.user.id])
  assert.equal((await solve(seeker.cookie, id)).data.item.id, 16)
})

test('gifts and finds never use a retired item', async () => {
  const { seeker, id } = await atRiddle()
  assert.ok((await one('SELECT item_id FROM gifts')).item_id <= 16)
  await pool.query('UPDATE gifts SET item_id = 24') // hidden before the models arrived
  // (17 and 18, the retired Ferraris, behave the same way.)
  const { data } = await solve(seeker.cookie, id)
  assert.ok(data.item.id >= 1 && data.item.id <= 16)
  assert.ok(data.item.credit.author)
  for (const file of ['model', 'preview']) {
    const response = await fetch(`${base}collection/${data.item.id}/${file}`, { headers: { cookie: seeker.cookie } })
    assert.equal(response.status, 200)
    await response.arrayBuffer()
  }
})

test('five wrong answers end the hunt, even when sent together', async () => {
  const { seeker, id } = await atRiddle()
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

test('the matching frame is kept, stripped of EXIF and private', async () => {
  const { hider, seeker, id } = await arrived()
  await frame(seeker.cookie, id)
  await frame(seeker.cookie, id)
  const url = (await call('gifts/mine', hider.cookie)).data.gifts[0].photoUrl.replace('/api/', '')

  for (const { cookie } of [hider, seeker]) {
    const response = await fetch(base + url, { headers: { cookie } })
    assert.equal(response.headers.get('content-type'), 'image/jpeg')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    const stored = Buffer.from(await response.arrayBuffer())
    assert.ok(!stored.includes('home-address-in-exif'))
    const meta = await sharp(stored).metadata()
    assert.equal(meta.exif, undefined)
    assert.equal(meta.width, 640)
  }
  assert.equal((await call(url, (await student('stranger')).cookie)).status, 404)
})

test('positions are never stored', async () => {
  await arrived()
  const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'hunts'")
  assert.ok(!rows.some((row) => /lat|lon|accuracy/.test(row.column_name)))
})

test('an older gift without spot photos stays out of the hunt, even with a riddle', async () => {
  const hider = await student('hider')
  const seeker = await student('seeker')
  const { data } = await hide(hider.cookie)
  await pool.query('UPDATE gifts SET location_key = NULL, location_name = NULL, clue = NULL, riddle = NULL, answers = NULL, floor = NULL')
  await pool.query('DELETE FROM gift_scenes')
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')

  const path = `gifts/${data.gift.id}/puzzle`
  assert.equal((await call(path, seeker.cookie, SECRET)).status, 404)
  assert.equal((await call(path, hider.cookie, SECRET)).status, 200)
  assert.equal((await call(path, hider.cookie, SECRET)).data.error.code, 'ALREADY_SET')
  assert.equal((await search(seeker.cookie)).data.error.code, 'NO_GIFTS')
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
