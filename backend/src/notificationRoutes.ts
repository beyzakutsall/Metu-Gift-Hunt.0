import { Router } from 'express'
import { AppError } from './errors.js'
import type { NotificationHub } from './notificationHub.js'
import type { NotificationService } from './notificationService.js'
import type { RequireUser } from './requireUser.js'

const HEARTBEAT_MS = 25_000
// The browser reconnects by itself, which re-checks the session.
const MAX_STREAM_MS = 10 * 60_000

export function createNotificationRoutes(requireUser: RequireUser, service: NotificationService, hub: NotificationHub) {
  const router = Router()

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-transform')
    next()
  })

  router.get('/', async (req, res) => {
    const user = await requireUser(req)
    res.json(await service.list(user.id))
  })

  router.post('/read', async (req, res) => {
    const user = await requireUser(req)
    const upTo: unknown = req.body?.upTo
    if (typeof upTo !== 'number' || !Number.isInteger(upTo) || upTo < 0 || upTo > 2_147_483_647) {
      throw new AppError(400, 'VALIDATION', 'Invalid notification.')
    }
    await service.markRead(user.id, upTo)
    res.status(204).end()
  })

  // Server-sent events: live updates over ordinary HTTP.
  router.get('/stream', async (req, res) => {
    const user = await requireUser(req)
    if (res.destroyed) return // left while the session was being checked

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' })
    // Subscribe before the first byte, so nothing published after "connected" is missed.
    const unsubscribe = hub.subscribe({
      userId: user.id,
      send: (event) => void res.write(`event: gift-hidden\ndata: ${JSON.stringify(event)}\n\n`),
    })
    res.write('retry: 3000\n: connected\n\n')

    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS)
    function stop() {
      clearInterval(heartbeat)
      clearTimeout(expiry)
      unsubscribe()
    }
    // Stop before ending: "close" fires later, and a write in between would be a write after end.
    const expiry = setTimeout(() => {
      stop()
      res.end()
    }, MAX_STREAM_MS)
    res.on('close', stop)
  })

  return router
}
