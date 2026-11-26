import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const ROOT = fileURLToPath(new URL('../backend/assets/collection/', import.meta.url))
// The sample finds in src/services/mockCollection.ts. The real app gets every model from the API.
const FILES = [1, 5, 6, 7, 12].flatMap((id) => [`${id}.glb`, `${id}.webp`])
const BASE = 'mock-collection/'

/** Mock mode has no API, so its sample models are plain files. */
export function mockCollection(mode: string): Plugin | false {
  if (mode !== 'mock') return false
  return {
    name: 'mock-collection',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0]
        const file = FILES.find((name) => path === `/${BASE}${name}`)
        if (!file) return next()
        res.setHeader('Content-Type', file.endsWith('.glb') ? 'model/gltf-binary' : 'image/webp')
        res.end(readFileSync(ROOT + file))
      })
    },
    generateBundle() {
      for (const file of FILES) this.emitFile({ type: 'asset', fileName: BASE + file, source: readFileSync(ROOT + file) })
    },
  }
}
