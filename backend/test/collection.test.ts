import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { test } from 'node:test'
import { base, createUser, pool } from './helpers.js'

const get = (path: string, cookie = '', headers: Record<string, string> = {}) =>
  fetch(`${base}collection/${path}`, { headers: { cookie, ...headers } })
const own = (userId: string, where = 'active') =>
  pool.query(`INSERT INTO user_collection (user_id, item_id) SELECT $1, id FROM collection_items WHERE ${where}`, [userId])

test('models and previews require a session', async () => {
  for (const path of ['1/model', '1/preview']) {
    const response = await get(path)
    assert.equal(response.status, 401)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('locked, retired, unknown and malformed ids all look the same', async () => {
  const { cookie, data } = await createUser()
  await own(data.user.id, 'id IN (2, 24)')
  const bodies = new Set<string>()
  for (const id of ['1', '24', '999', '0', '99999', '-1', '02', '1.5', '2abc', '..%2F..%2Fpackage']) {
    for (const file of ['model', 'preview']) {
      const response = await get(`${id}/${file}`, cookie)
      assert.equal(response.status, 404, id)
      bodies.add(await response.text())
    }
  }
  assert.equal(bodies.size, 1)
})

test('only the finder gets a model', async () => {
  const finder = await createUser()
  const other = await createUser({ username: 'other', email: 'other@metu.edu.tr' })
  await own(finder.data.user.id, 'id = 5')
  assert.equal((await get('5/model', finder.cookie)).status, 200)
  assert.equal((await get('5/model', other.cookie)).status, 404)

  const etag = (await get('5/model', finder.cookie)).headers.get('etag')!
  // A cached copy is no way round the check.
  assert.equal((await get('5/model', other.cookie, { 'if-none-match': etag })).status, 404)
})

test('every collectible has a valid model, a preview and a credit', async () => {
  const { cookie, data } = await createUser()
  await own(data.user.id)
  const { rows } = await pool.query('SELECT id, credit FROM collection_items WHERE active')
  assert.equal(rows.length, 18)
  const credits = await readFile(new URL('../assets/collection/CREDITS.md', import.meta.url), 'utf8')

  for (const { id, credit } of rows) {
    const model = await get(`${id}/model`, cookie)
    assert.equal(model.headers.get('content-type'), 'model/gltf-binary')
    assert.equal(model.headers.get('cache-control'), 'private, no-cache')
    const glb = Buffer.from(await model.arrayBuffer())
    assert.equal(glb.toString('ascii', 0, 4), 'glTF', `model ${id}`)
    assert.ok(glb.length < 1.5 * 1024 * 1024, `model ${id} is too heavy for a phone`)
    assert.equal(glb.length, (await stat(new URL(`../assets/collection/${id}.glb`, import.meta.url))).size)

    const preview = await get(`${id}/preview`, cookie)
    assert.equal(preview.headers.get('content-type'), 'image/webp')
    assert.equal(Buffer.from(await preview.arrayBuffer()).toString('ascii', 8, 12), 'WEBP', `preview ${id}`)

    for (const part of [credit.source, credit.author, credit.licenseUrl]) assert.ok(credits.includes(part), part)
  }
})
