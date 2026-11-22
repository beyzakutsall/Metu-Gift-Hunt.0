import { Router } from 'express'
import { PLACE_PROBLEMS, cleanNote, noteError, roundCoordinate } from '../../shared/giftRules.js'
import { campus } from './campus.js'
import { AppError } from './errors.js'
import type { GiftService } from './giftService.js'
import type { RateLimiter } from './rateLimit.js'
import type { RequireUser } from './requireUser.js'

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function createGiftRoutes(requireUser: RequireUser, gifts: GiftService, limiter: RateLimiter) {
  const router = Router()

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/mine', async (req, res) => {
    const user = await requireUser(req)
    res.json({ gifts: await gifts.mine(user.id) })
  })

  router.post('/', async (req, res) => {
    const user = await requireUser(req)
    limiter.hit(`hide:${user.id}`, 30, 10)
    const invalid = (message: string, field?: string) => new AppError(400, 'VALIDATION', message, { field })

    const { requestId, latitude: lat, longitude: lon, note } = req.body ?? {}
    if (typeof requestId !== 'string' || !UUID.test(requestId)) throw invalid('Reload the page and try again.')
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw invalid('Pick a place on the map.', 'place')
    }
    const text = typeof note === 'string' ? note : ''
    const noteProblem = noteError(text)
    if (noteProblem) throw invalid(noteProblem, 'note')

    const latitude = roundCoordinate(lat)
    const longitude = roundCoordinate(lon)
    const placeProblem = PLACE_PROBLEMS[campus.durum(latitude, longitude)]
    if (placeProblem) throw invalid(placeProblem, 'place')

    const { gift, created } = await gifts.hide(user.id, { requestId, latitude, longitude, note: cleanNote(text) })
    res.status(created ? 201 : 200).json({ gift })
  })

  return router
}
