import { Router } from 'express'
import {
  PLACE_PROBLEMS,
  answersError,
  cleanText,
  clueError,
  noteError,
  riddleError,
  roundCoordinate,
  splitAnswers,
} from '../../shared/giftRules.js'
import { campus } from './campus.js'
import { AppError } from './errors.js'
import type { GiftService } from './giftService.js'
import { invalid, isUuid, readId, readPoint, readText } from './input.js'
import type { RateLimiter } from './rateLimit.js'
import type { RequireUser } from './requireUser.js'

const readPuzzle = (body: unknown) => ({
  clue: cleanText(readText(body, 'clue', clueError)),
  riddle: cleanText(readText(body, 'riddle', riddleError)),
  answers: splitAnswers(readText(body, 'answer', answersError)),
})

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

    const requestId: unknown = req.body?.requestId
    if (!isUuid(requestId)) throw invalid('Reload the page and try again.')
    const point = readPoint(req.body, 'place')
    const puzzle = readPuzzle(req.body)
    const note = cleanText(readText(req.body, 'note', noteError))

    const latitude = roundCoordinate(point.latitude)
    const longitude = roundCoordinate(point.longitude)
    const problem = PLACE_PROBLEMS[campus.durum(latitude, longitude)]
    if (problem) throw invalid(problem, 'place')
    const location = campus.anaKonum(latitude, longitude)!

    const { gift, created } = await gifts.hide(user.id, {
      requestId, latitude, longitude, note, ...puzzle,
      locationKey: location.anahtar,
      locationName: location.ad,
    })
    res.status(created ? 201 : 200).json({ gift })
  })

  router.post('/:id/puzzle', async (req, res) => {
    const user = await requireUser(req)
    const id = readId(req.params.id)
    const puzzle = readPuzzle(req.body)
    const { latitude, longitude } = await gifts.position(user.id, id)
    const location = campus.anaKonum(latitude, longitude)
    if (!location) {
      throw new AppError(409, 'NOT_HUNTABLE', 'This older gift is in a place that isn’t open for hunts, so it can’t be searched for.')
    }
    res.json({ gift: await gifts.addPuzzle(user.id, id, { ...puzzle, locationKey: location.anahtar, locationName: location.ad }) })
  })

  return router
}
