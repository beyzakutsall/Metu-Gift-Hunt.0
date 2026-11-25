import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import express, { type Express } from 'express'
import type { HelmetOptions } from 'helmet'

const PAGES = ['index.html', '3d-harita/minecraft.html']

// The map's import map is an inline script. A hash allows exactly that text and nothing else,
// so a change to minecraft.html is picked up at the next start without editing this file.
function inlineScriptHashes(dir: string) {
  const hashes = new Set<string>()
  for (const page of PAGES) {
    const file = join(dir, page)
    if (!existsSync(file)) continue
    for (const [, body] of readFileSync(file, 'utf8').matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      hashes.add(`'sha256-${createHash('sha256').update(body!).digest('base64')}'`)
    }
  }
  return [...hashes]
}

export function helmetOptions(frontendDir: string | undefined, appUrl: string): HelmetOptions {
  return {
    contentSecurityPolicy: {
      directives: {
        // The map loads three.js as modules from jsDelivr. 'wasm-unsafe-eval' is for the meshopt
        // decoder that unpacks the collectible models; it doesn't allow eval().
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'", ...(frontendDir ? inlineScriptHashes(frontendDir) : [])],
        // GLTFLoader turns textures inside a .glb into blob: URLs, and fetches them in Chrome.
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'blob:'],
        // The app shows the map in a same-origin iframe; nobody else may frame either.
        frameSrc: ["'self'"],
        frameAncestors: ["'self'"],
        // Only behind HTTPS: on http://localhost it would break every request.
        upgradeInsecureRequests: appUrl.startsWith('https://') ? [] : null,
      },
    },
    strictTransportSecurity: appUrl.startsWith('https://'),
  }
}

/** The built frontend (with the map in dist/3d-harita), on the API's origin so cookies and the origin check work. */
export function serveFrontend(app: Express, dir: string) {
  app.use(
    express.static(dir, {
      index: false,
      setHeaders(res, path) {
        // Vite puts a content hash in every name under assets/. Everything else can change in place.
        res.setHeader('Cache-Control', /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache')
      },
    }),
  )
  const index = join(dir, 'index.html')
  // Client-side routes such as /hide or /verify-email. A missing file (it has a dot) stays a 404.
  app.get(/^(?!\/api\/)[^.]*$/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(index)
  })
}
