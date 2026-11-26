import express, { Router } from 'express'
import {
  PLACE_PROBLEMS,
  answersError,
  cleanText,
  clueError,
  floorError,
  noteError,
  riddleError,
  roundCoordinate,
  splitAnswers,
} from '../../shared/giftRules.js'
import { ARRIVE_MAX_ACCURACY, FRAME_MAX_BYTES, SCENE_PHOTOS, arrivalRadius } from '../../shared/huntRules.js'
import { campus } from './campus.js'
import { AppError } from './errors.js'
import type { GiftService } from './giftService.js'
import { invalid, isUuid, readFix, readId, readPoint, readText } from './input.js'
import type { MatchQueue } from './matcher/queue.js'
import type { Plausibility } from './plausibility.js'
import type { RateLimiter } from './rateLimit.js'
import type { RequireUser } from './requireUser.js'
import { readScene } from './scenes.js'

const readPuzzle = (body: unknown) => ({
  clue: cleanText(readText(body, 'clue', clueError)),
  riddle: cleanText(readText(body, 'riddle', riddleError)),
  answers: splitAnswers(readText(body, 'answer', answersError)),
})

interface Deps {
  requireUser: RequireUser
  gifts: GiftService
  limiter: RateLimiter
  queue: MatchQueue
  plausibility: Plausibility
}

export function createGiftRoutes({ requireUser, gifts, limiter, queue, plausibility }: Deps) {
  const router = Router()
  const smallBody = express.json({ limit: '10kb' })
  // Base64 is a third larger than the photos it carries.
  const sceneBody = express.json({ limit: Math.ceil((SCENE_PHOTOS * FRAME_MAX_BYTES * 4) / 3) + 20_000 })

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/mine', async (req, res) => {
    const user = await requireUser(req)
    res.json({ gifts: await gifts.mine(user.id) })
  })

  // Mounted before the app's body parser: log in first, and only then may the photos be read.
  router.post('/', async (req, res, next) => {
    res.locals.user = await requireUser(req)
    limiter.hit(`hide:${res.locals.user.id}`, 30, 10)
    next()
  }, sceneBody, async (req, res) => {
    const { user } = res.locals

    const requestId: unknown = req.body?.requestId
    if (!isUuid(requestId)) throw invalid('Reload the page and try again.')
    const point = readPoint(req.body, 'place')
    const puzzle = readPuzzle(req.body)
    const note = cleanText(readText(req.body, 'note', noteError))
    const floor = cleanText(readText(req.body, 'floor', floorError))

    const latitude = roundCoordinate(point.latitude)
    const longitude = roundCoordinate(point.longitude)
    const problem = PLACE_PROBLEMS[campus.durum(latitude, longitude)]
    if (problem) throw invalid(problem, 'place')
    const location = campus.anaKonum(latitude, longitude)!

    // The hider has to be there: the photos are what finders will be matched against.
    const fix = readFix(req.body?.location)
    if (fix.accuracy > ARRIVE_MAX_ACCURACY) {
      throw new AppError(422, 'WEAK_GPS', 'Your GPS signal is too weak. Move near a window and try again.', { field: 'location' })
    }
    if (campus.binayaUzaklik(location.anahtar, fix.latitude, fix.longitude) > arrivalRadius(fix.accuracy)) {
      throw new AppError(422, 'TOO_FAR', `Go to ${location.ad} to hide a gift there.`, { field: 'location' })
    }
    plausibility.check(`hide:${user.id}`, fix)

    const scene = await readScene(req.body, queue)
    const { gift, created } = await gifts.hide(user.id, {
      requestId, latitude, longitude, note, floor, scene, ...puzzle,
      locationKey: location.anahtar,
      locationName: location.ad,
    })
    res.status(created ? 201 : 200).json({ gift })
  })

  router.post('/:id/puzzle', smallBody, async (req, res) => {
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
