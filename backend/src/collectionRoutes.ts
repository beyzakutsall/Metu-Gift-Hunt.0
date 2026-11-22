import { Router } from 'express'
import { fileURLToPath } from 'node:url'
import type { CollectionService } from './collectionService.js'
import { AppError } from './errors.js'
import type { RequireUser } from './requireUser.js'

const root = fileURLToPath(new URL('../assets/collection/', import.meta.url))
const FILES = {
  model: { extension: 'glb', type: 'model/gltf-binary' },
  preview: { extension: 'webp', type: 'image/webp' },
}

// Not static files: a model is sent only to a student who has found it.
export function createCollectionRoutes(requireUser: RequireUser, collection: CollectionService) {
  const router = Router()

  for (const [name, { extension, type }] of Object.entries(FILES)) {
    router.get(`/:id/${name}`, async (req, res) => {
      res.set('Cache-Control', 'no-store')
      const user = await requireUser(req)
      const id = String(req.params.id)
      // Locked and unknown items look the same.
      if (!/^[1-9]\d{0,3}$/.test(id) || !(await collection.owns(user.id, Number(id)))) {
        throw new AppError(404, 'NOT_FOUND', 'Not found.')
      }
      // Revalidated each time, so a shared browser can't show another account's finds.
      res.set('Cache-Control', 'private, no-cache')
      res.type(type).sendFile(`${id}.${extension}`, { root, cacheControl: false })
    })
  }

  return router
}
