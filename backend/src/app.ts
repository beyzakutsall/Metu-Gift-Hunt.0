import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import type pg from 'pg'
import { createAuthRoutes } from './authRoutes.js'
import { createAuthService } from './authService.js'
import { AppError } from './errors.js'
import { createGiftRoutes } from './giftRoutes.js'
import { createGiftService } from './giftService.js'
import type { Mailer } from './mailer.js'
import { createHuntRoutes } from './huntRoutes.js'
import { createHuntService } from './huntService.js'
import { createNotificationHub } from './notificationHub.js'
import { createNotificationRoutes } from './notificationRoutes.js'
import { createNotificationService } from './notificationService.js'
import { createRateLimiter } from './rateLimit.js'
import { createRequireUser } from './requireUser.js'
import { createSessionCookie } from './sessionCookie.js'
import { createStudentRoutes } from './studentRoutes.js'
import { createStudentService } from './studentService.js'

interface Options {
  pool: pg.Pool
  mailer: Mailer
  appUrl: string
  secureCookies: boolean
  trustProxy: number
}

export function createApp({ pool, mailer, appUrl, secureCookies, trustProxy }: Options) {
  const app = express()
  const limiter = createRateLimiter()
  const auth = createAuthService(pool, mailer, limiter, appUrl)

  const cookie = createSessionCookie(secureCookies)
  const requireUser = createRequireUser(auth, cookie)
  const hub = createNotificationHub()

  app.set('trust proxy', trustProxy)
  app.use(helmet())

  // CSRF defence, together with SameSite cookies: our origin and JSON only.
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      const { origin } = req.headers
      if (origin && origin !== appUrl) throw new AppError(403, 'BAD_ORIGIN', `Please open the app at ${appUrl}.`)
      if (!req.headers['content-type']?.startsWith('application/json')) {
        throw new AppError(415, 'JSON_REQUIRED', 'Requests must be JSON.')
      }
    }
    next()
  })
  // Before the global parser: one hunt route takes a photo, and sets its own limit.
  app.use('/api/hunts', createHuntRoutes(requireUser, createHuntService(pool), limiter))
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  })
  app.use('/api/auth', createAuthRoutes(auth, limiter, cookie))
  app.use('/api/student', createStudentRoutes(requireUser, createStudentService(pool)))
  app.use('/api/gifts', createGiftRoutes(requireUser, createGiftService(pool, hub), limiter))
  app.use('/api/notifications', createNotificationRoutes(requireUser, createNotificationService(pool), hub))
  app.use(() => {
    throw new AppError(404, 'NOT_FOUND', 'Not found.')
  })

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, ...error.details } })
    } else if (error.status === 413) {
      res.status(413).json({ error: { code: 'TOO_LARGE', message: 'That’s too large. Try a smaller photo or shorter text.' } })
    } else if (error.status >= 400 && error.status < 500) {
      res.status(error.status).json({ error: { code: 'BAD_REQUEST', message: 'That request could not be read.' } })
    } else {
      // Only the stack: body-parser and pg errors can carry request data.
      console.error(error.stack)
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on our side. Please try again.' } })
    }
  }
  app.use(handleError)

  return { app, auth }
}
