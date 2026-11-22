import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import type pg from 'pg'
import { createAuthRoutes } from './authRoutes.js'
import { createAuthService } from './authService.js'
import { AppError } from './errors.js'
import type { Mailer } from './mailer.js'
import { createRateLimiter } from './rateLimit.js'
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
  app.use(express.json({ limit: '10kb' }))

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  })
  app.use('/api/auth', createAuthRoutes(auth, limiter, cookie))
  app.use('/api/student', createStudentRoutes(auth, createStudentService(pool), cookie))
  app.use(() => {
    throw new AppError(404, 'NOT_FOUND', 'Not found.')
  })

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, ...error.details } })
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
