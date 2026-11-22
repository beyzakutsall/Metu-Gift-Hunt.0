import express, { Router } from 'express'
import { guessError } from '../../shared/giftRules.js'
import { PHOTO_MAX_BYTES } from '../../shared/huntRules.js'
import type { HuntService } from './huntService.js'
import { readFix, readId, readText } from './input.js'
import type { RateLimiter } from './rateLimit.js'
import type { RequireUser } from './requireUser.js'

export function createHuntRoutes(requireUser: RequireUser, hunts: HuntService, limiter: RateLimiter) {
  const router = Router()
  const smallBody = express.json({ limit: '10kb' })
  // Base64 is a third larger than the photo it carries.
  const photoBody = express.json({ limit: Math.ceil((PHOTO_MAX_BYTES * 4) / 3) + 10_000 })

  // Mounted before the app's body parser: log in first, and only then may a large body be read.
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.locals.user = await requireUser(req)
    next()
  })

  router.get('/current', async (_req, res) => {
    res.json(await hunts.current(res.locals.user.id))
  })

  router.post('/', smallBody, async (_req, res) => {
    limiter.hit(`search:${res.locals.user.id}`, 30, 10)
    const { hunt, created } = await hunts.start(res.locals.user.id)
    res.status(created ? 201 : 200).json({ hunt })
  })

  router.post('/:id/location', smallBody, async (req, res) => {
    limiter.hit(`position:${res.locals.user.id}`, 240, 10)
    res.json(await hunts.checkIn(res.locals.user.id, readId(req.params.id), readFix(req.body)))
  })

  router.post(
    '/:id/solve',
    (_req, res, next) => {
      limiter.hit(`solve:${res.locals.user.id}`, 20, 10)
      next()
    },
    photoBody,
    async (req, res) => {
      const id = readId(req.params.id)
      const answer = readText(req.body, 'answer', guessError)
      res.json(await hunts.solve(res.locals.user.id, id, { fix: readFix(req.body), answer, photo: req.body?.photo }))
    },
  )

  router.post('/:id/give-up', smallBody, async (req, res) => {
    await hunts.giveUp(res.locals.user.id, readId(req.params.id))
    res.status(204).end()
  })

  router.get('/:id/photo', async (req, res) => {
    const jpeg = await hunts.photo(res.locals.user.id, readId(req.params.id))
    res.type('image/jpeg').send(jpeg)
  })

  return router
}
