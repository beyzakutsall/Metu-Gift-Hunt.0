import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { base, createUser, later, pool } from './helpers.js'
import { hiderPhotos, plainPhoto } from './images.js'

const PUZZLE = { clue: 'On the third floor', riddle: 'Which hall hosts the event?', answer: 'Cahit Arf' }
const SPOT = { latitude: 39.893962, longitude: 32.784009 } // grass near the Cafeteria

async function call(path: string, cookie = '', body?: object) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { cookie, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  return { status: response.status, data: (await response.json().catch(() => null)) as any }
}

const PHOTOS = (await hiderPhotos(1)).map((photo) => photo.toString('base64'))
const PLAIN = (await plainPhoto()).toString('base64')

/** The hider stands where they hide it, with their three photos of the spot. */
function hide(cookie: string, overrides: Record<string, unknown> = {}) {
  const place = { ...SPOT, ...overrides }
  const location = { latitude: place.latitude, longitude: place.longitude, accuracy: 10 }
  const body = { requestId: randomUUID(), ...SPOT, ...PUZZLE, note: 'Look under the bench', floor: 'Ground floor', location, photos: PHOTOS }
  return call('gifts', cookie, { ...body, ...overrides })
}

const student = (name: string) => createUser({ username: name, email: `${name}@metu.edu.tr` })

const count = async (table: 'gifts' | 'notifications' | 'gift_actions') =>
  (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number

async function listen(cookie: string) {
  const abort = new AbortController()
  const response = await fetch(`${base}notifications/stream`, { headers: { cookie }, signal: abort.signal })
  assert.match(response.headers.get('content-type')!, /text\/event-stream/)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  async function until(part: string) {
    while (!text.includes(part)) {
      const { value, done } = await reader.read()
      if (done) throw new Error('stream ended')
      text += decoder.decode(value, { stream: true })
    }
  }
  await until(': connected')
  return {
    async next() {
      await until('"mine"')
      await until('}\n\n')
      return { raw: text, event: JSON.parse(/data: (.+)/.exec(text)![1]!) }
    },
    close: () => abort.abort(),
  }
}

test('every gift and notification endpoint requires a session', async () => {
  for (const path of ['gifts/mine', 'notifications', 'notifications/stream']) {
    assert.equal((await call(path)).status, 401, path)
  }
  assert.equal((await hide('')).status, 401)
  assert.equal((await call('notifications/read', '', { upTo: 1 })).status, 401)
})

test('hiding saves the spot and note, uses one daily slot and creates one notification', async () => {
  const { cookie } = await student('hider')
  const { status, data } = await hide(cookie, { note: '  Ağacın altında 🌲\r\nİyi şanslar!  ' })
  assert.equal(status, 201)
  assert.equal(data.gift.note, 'Ağacın altında 🌲\nİyi şanslar!')
  assert.equal(data.gift.latitude, SPOT.latitude)
  assert.equal((await call('student/profile', cookie)).data.hides.today, 1)
  assert.equal(await count('notifications'), 1)
})

test('the sticker inside stays secret from the hider', async () => {
  const { cookie } = await student('hider')
  const { data } = await hide(cookie)
  const fields = [
    'answers', 'clue', 'createdAt', 'floor', 'foundAt', 'id', 'latitude', 'locationName', 'longitude', 'note', 'photoUrl', 'riddle',
  ]
  assert.deepEqual(Object.keys(data.gift).sort(), fields)
  assert.deepEqual(Object.keys((await call('gifts/mine', cookie)).data.gifts[0]).sort(), fields)
  assert.ok((await pool.query('SELECT item_id FROM gifts')).rows[0].item_id >= 1)
})

const forbidden: [string, number, number, RegExp][] = [
  ['building closed to hunts', 39.897502, 32.781694, /open for hunts/],
  ['restricted area', 39.895962, 32.780853, /restricted/],
  ['far from any building', 39.897583, 32.776959, /too far/],
  ['road', 39.893206, 32.784009, /road/],
  ['water', 39.895475, 32.786956, /water/],
  ['off campus', 39.895853, 32.79113, /outside/],
  ['military zone', 39.8925, 32.7625, /outside|restricted/],
  ['another city', 41.0082, 28.9784, /outside/],
  ['extreme numbers', 1e300, -1e300, /outside/],
]
for (const [name, latitude, longitude, message] of forbidden) {
  test(`the server refuses a gift at: ${name}`, async () => {
    const { cookie } = await student('hider')
    const { status, data } = await hide(cookie, { latitude, longitude })
    assert.equal(status, 400)
    assert.match(data.error.message, message)
    assert.equal(await count('gift_actions'), 0)
  })
}

test('no sensitive building can be a hiding place', async () => {
  const { cookie } = await student('hider')
  const osm = JSON.parse(readFileSync(new URL('../../3d-harita/data/campus.json', import.meta.url), 'utf8'))
  const names = ['ASELSAN ARGE Binası', 'TÜBİTAK SAGE Güdüm Kontrol Laboratuvarı', 'Yüksek Radyasyon Binası', 'Yuva ve Anaokulu', '4. Yurt']
  for (const name of names) {
    const building = osm.elements.find((o: any) => o.tags?.name === name)
    assert.ok(building, name)
    const n = building.geometry.length
    const latitude = building.geometry.reduce((sum: number, p: any) => sum + p.lat, 0) / n
    const longitude = building.geometry.reduce((sum: number, p: any) => sum + p.lon, 0) / n
    assert.equal((await hide(cookie, { latitude, longitude })).status, 400, name)
  }
})

test('malformed input is refused without using up a slot', async () => {
  const { cookie } = await student('hider')
  const cases = [
    { note: '' }, { clue: '' }, { riddle: '?' }, { answer: ';' }, { answer: 'a;b;c;d;e;f' }, { note: ' \n ' }, { note: '\u0000' }, { note: 'x'.repeat(201) }, { note: ['x'] },
    { latitude: '39.89' }, { longitude: null }, { requestId: 'nope' },
    { floor: '' }, { floor: 'x'.repeat(41) }, { location: undefined }, { location: { latitude: 39.89 } },
    { photos: undefined }, { photos: PHOTOS.slice(0, 2) }, { photos: [...PHOTOS, PHOTOS[0]] }, { photos: ['bm90IGFuIGltYWdl', ...PHOTOS.slice(1)] },
  ]
  for (const override of cases) assert.equal((await hide(cookie, override)).status, 400, JSON.stringify(override))
  assert.equal(await count('gift_actions'), 0)
})

test('control characters are removed and markup stays plain text', async () => {
  const { cookie } = await student('hider')
  const { data } = await hide(cookie, { note: 'a\u0000b <img src=x onerror=alert(1)>' })
  assert.equal(data.gift.note, 'ab <img src=x onerror=alert(1)>')
})

test('only three hides a day, even when requested at the same moment', async () => {
  const { cookie } = await student('hider')
  const results = await Promise.all(Array.from({ length: 8 }, () => hide(cookie)))
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 409, 409, 409, 409, 409])
  assert.equal(await count('gifts'), 3)
  assert.equal(await count('notifications'), 3)
})

test("yesterday's hides do not count today", async () => {
  const { cookie, data } = await student('hider')
  for (const slot of [1, 2, 3]) {
    await pool.query(
      `INSERT INTO gift_actions (user_id, kind, slot, day)
       VALUES ($1, 'hide', $2, (now() AT TIME ZONE 'Europe/Istanbul')::date - 1)`,
      [data.user.id, slot],
    )
  }
  assert.equal((await hide(cookie)).status, 201)
})

test('a retried request creates one gift and one notification, even at the limit', async () => {
  const { cookie } = await student('hider')
  await hide(cookie)
  await hide(cookie)
  const requestId = randomUUID()
  const results = await Promise.all([hide(cookie, { requestId }), hide(cookie, { requestId })])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 201])
  assert.equal((await hide(cookie, { requestId })).status, 200)
  assert.equal(await count('notifications'), 3)
})

test('students cannot list where others hid gifts', async () => {
  const hider = await student('hider')
  const other = await student('other')
  await hide(hider.cookie)
  assert.deepEqual((await call('gifts/mine', other.cookie)).data.gifts, [])
})

test('every student is notified, without who, where or the note', async () => {
  const hider = await student('hider')
  const others = [await student('one'), await student('two'), await student('three')]
  await hide(hider.cookie)
  for (const { cookie } of others) {
    const { data } = await call('notifications', cookie)
    assert.equal(data.unread, 1)
    assert.deepEqual(Object.keys(data.items[0]).sort(), ['createdAt', 'id', 'mine', 'read'])
    assert.equal(data.items[0].mine, false)
  }
  const own = (await call('notifications', hider.cookie)).data
  assert.equal(own.unread, 0)
  assert.equal(own.items[0].mine, true)
})

test('new students do not inherit old notifications', async () => {
  const hider = await student('hider')
  await hide(hider.cookie)
  const late = await student('late')
  assert.equal((await call('notifications', late.cookie)).data.items.length, 0)
})

test('reading is per student and cannot cover future notifications', async () => {
  const hider = await student('hider')
  const reader = await student('reader')
  const other = await student('other')
  await hide(hider.cookie)
  assert.equal((await call('notifications/read', reader.cookie, { upTo: 2_000_000_000 })).status, 204)
  assert.equal((await call('notifications', reader.cookie)).data.unread, 0)
  assert.equal((await call('notifications', other.cookie)).data.unread, 1)
  await hide(hider.cookie)
  assert.equal((await call('notifications', reader.cookie)).data.unread, 1)
})

test('connected students are notified live', { timeout: 10_000 }, async () => {
  const hider = await student('hider')
  const other = await student('other')
  const mine = await listen(hider.cookie)
  const theirs = await listen(other.cookie)
  await hide(hider.cookie, { note: 'secret-note' })

  const received = await theirs.next()
  assert.equal(received.event.mine, false)
  assert.deepEqual(Object.keys(received.event).sort(), ['createdAt', 'id', 'mine'])
  assert.ok(!received.raw.includes('secret-note') && !received.raw.includes('39.89'))
  assert.equal((await mine.next()).event.mine, true)
  mine.close()
  theirs.close()
})

test('the hider must be at the building, with a believable reading', async () => {
  const { cookie } = await student('hider')
  const away = { latitude: SPOT.latitude + 0.003, longitude: SPOT.longitude, accuracy: 10 }
  assert.equal((await hide(cookie, { location: away })).data.error.code, 'TOO_FAR')
  assert.equal((await hide(cookie, { location: { ...SPOT, accuracy: 300 } })).data.error.code, 'WEAK_GPS')
  assert.equal((await hide(cookie, { location: { ...SPOT, accuracy: 0 } })).data.error.code, 'SUSPICIOUS_GPS')
  assert.equal(await count('gift_actions'), 0)
})

test('a hider can only move as fast as a person', async () => {
  const { cookie } = await student('hider')
  const cafeteria = { latitude: SPOT.latitude, longitude: SPOT.longitude, accuracy: 10 }
  const math = { latitude: 39.895664, longitude: 32.782291 }
  assert.equal((await hide(cookie, { location: cafeteria })).status, 201)
  assert.equal((await hide(cookie, { ...math, location: { ...math, accuracy: 10 } })).data.error.code, 'TOO_FAST')
  later(5 * 60)
  assert.equal((await hide(cookie, { ...math, location: { ...math, accuracy: 10 } })).status, 201)
})

test('a spot photo without enough detail is refused, naming which one', async () => {
  const { cookie } = await student('hider')
  const { status, data } = await hide(cookie, { photos: [PHOTOS[0], PLAIN, PHOTOS[2]] })
  assert.equal(status, 400)
  assert.equal(data.error.field, 'photos')
  assert.match(data.error.message, /Photo 2/)
  assert.equal(await count('gift_actions'), 0)
})

test('the spot photos are stored for matching, with the floor', async () => {
  const { cookie } = await student('hider')
  const { data } = await hide(cookie, { floor: ' 3rd floor ' })
  assert.equal(data.gift.floor, '3rd floor')
  const { rows } = await pool.query('SELECT idx, length(features) AS size, jpeg IS NOT NULL AS photo FROM gift_scenes ORDER BY idx')
  assert.deepEqual(rows.map((row) => row.idx), [0, 1, 2])
  assert.ok(rows.every((row) => row.size > 1000 && row.photo))
})
