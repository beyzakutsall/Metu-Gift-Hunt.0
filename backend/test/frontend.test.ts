import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import pg from 'pg'
import { createApp } from '../src/app.js'
import { parseSender } from '../src/mailer.js'

// No database: these routes never query. The pool connects lazily and is never used.
const importMap = '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"}}'
let dir: string
let server: Server
let base: string

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mgh-frontend-'))
  mkdirSync(join(dir, 'assets'))
  mkdirSync(join(dir, '3d-harita'))
  writeFileSync(join(dir, 'index.html'), '<!doctype html><div id="root"></div><script type="module" src="/assets/app-abc.js"></script>')
  writeFileSync(join(dir, 'assets', 'app-abc.js'), 'console.log(1)')
  writeFileSync(join(dir, '3d-harita', 'minecraft.html'), `<script type="importmap">${importMap}</script><script type="module" src="js/main.js"></script>`)
  const { app } = createApp({
    pool: new pg.Pool({ connectionString: 'postgresql://localhost:1/none' }),
    mailer: { delivery: 'console', send: async () => {} },
    appUrl: 'https://gift.example',
    secureCookies: true,
    trustProxy: 1,
    frontendDir: dir,
  })
  await new Promise<void>((resolve) => (server = app.listen(0, '127.0.0.1', () => resolve())))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => {
  server.closeAllConnections()
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('serving the frontend', () => {
  test('client-side routes get index.html', async () => {
    for (const path of ['/', '/verify-email', '/hide']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200, path)
      assert.match(await response.text(), /id="root"/)
      assert.equal(response.headers.get('cache-control'), 'no-cache')
    }
  })

  test('hashed assets are cached for long, the map is revalidated', async () => {
    const asset = await fetch(`${base}/assets/app-abc.js`)
    assert.match(asset.headers.get('cache-control')!, /immutable/)
    const map = await fetch(`${base}/3d-harita/minecraft.html`)
    assert.equal(map.status, 200)
    assert.equal(map.headers.get('cache-control'), 'no-cache')
  })

  test('the CSP allows the map’s import map and CDN, and nothing inline else', async () => {
    const csp = (await fetch(`${base}/3d-harita/minecraft.html`)).headers.get('content-security-policy')!
    const hash = createHash('sha256').update(importMap).digest('base64')
    const scriptSrc = csp.split(';').find((part) => part.startsWith('script-src'))!
    assert.match(scriptSrc, /https:\/\/cdn\.jsdelivr\.net/)
    assert.ok(scriptSrc.includes(`'sha256-${hash}'`))
    assert.doesNotMatch(scriptSrc, /unsafe-inline/)
    assert.match(csp, /frame-ancestors 'self'/)
    assert.match(csp, /upgrade-insecure-requests/)
  })

  test('missing files and unknown API paths are 404s, not the app', async () => {
    assert.equal((await fetch(`${base}/3d-harita/missing.js`)).status, 404)
    assert.equal((await fetch(`${base}/../backend/.env`)).status, 404)
    const api = await fetch(`${base}/api/nothing`)
    assert.equal(api.status, 404)
    assert.equal((await api.json()).error.code, 'NOT_FOUND')
  })
})

describe('MAIL_FROM parsing', () => {
  test('name and address', () => {
    assert.deepEqual(parseSender('METU Gift Hunt <no-reply@gift.example>'), { name: 'METU Gift Hunt', email: 'no-reply@gift.example' })
    assert.deepEqual(parseSender('"Gift" <a@b.c>'), { name: 'Gift', email: 'a@b.c' })
    assert.deepEqual(parseSender('a@b.c'), { email: 'a@b.c' })
  })
})
