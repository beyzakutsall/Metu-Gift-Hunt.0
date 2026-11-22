import { readFileSync, readdirSync } from 'node:fs'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const ROOT = fileURLToPath(new URL('../3d-harita/', import.meta.url))
const BASE = '3d-harita/'
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.vox': 'application/octet-stream',
}

// Only what the browser needs: not tools, docs or type declarations.
function mapFiles() {
  const inFolders = ['css', 'js', 'data', 'modeller'].flatMap((folder) =>
    readdirSync(ROOT + folder).map((name) => `${folder}/${name}`),
  )
  return ['minecraft.html', ...inFolders].filter((file) => extname(file) in TYPES)
}

/** Serves the 3D map at /3d-harita/ as plain files, because it has no build step of its own. */
export function campusMap(): Plugin {
  return {
    name: 'campus-map',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith(`/${BASE}`)) return next()
        // An exact match against the list, so "../" can't reach other files.
        const file = mapFiles().find((name) => `/${BASE}${name}` === path)
        if (!file) {
          res.statusCode = 404
          return res.end()
        }
        res.setHeader('Content-Type', TYPES[extname(file)]!)
        res.setHeader('Cache-Control', 'no-cache')
        res.end(readFileSync(ROOT + file))
      })
    },
    generateBundle() {
      for (const file of mapFiles()) {
        this.emitFile({ type: 'asset', fileName: BASE + file, source: readFileSync(ROOT + file) })
      }
    },
  }
}
