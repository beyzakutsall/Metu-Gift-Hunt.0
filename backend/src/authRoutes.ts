import { Router, type Request, type Response } from 'express'
import { currentPasswordError, emailError, newPasswordError, usernameError, verifyCodeError } from '../../shared/authRules.js'
import type { AuthService } from './authService.js'
import { AppError } from './errors.js'
import type { RateLimiter } from './rateLimit.js'
import type { createRequireSession } from './requireUser.js'
import type { SessionCookie } from './sessionCookie.js'

function read(req: Request, field: string, validate: (value: string) => string | undefined) {
  const raw: unknown = req.body?.[field]
  const value = typeof raw === 'string' ? raw : ''
  const message = validate(value)
  if (message) throw new AppError(400, 'VALIDATION', message, { field })
  return value
}

const readEmail = (req: Request) => read(req, 'email', emailError).trim().toLowerCase()
const readToken = (req: Request) =>
  read(req, 'token', (value) => (/^[\w-]{43}$/.test(value) ? undefined : 'This link is invalid or incomplete.'))

export function createAuthRoutes(
  auth: AuthService,
  limiter: RateLimiter,
  cookie: SessionCookie,
  requireSession: ReturnType<typeof createRequireSession>,
) {
  const router = Router()
  const { name: cookieName, options: cookieOptions, read: sessionToken } = cookie

  function startSession(res: Response, session: Awaited<ReturnType<AuthService['login']>>) {
    // Without "remember me" the cookie has no max age and ends with the browser session.
    res.cookie(cookieName, session.token, session.remember ? { ...cookieOptions, maxAge: session.maxAge } : cookieOptions)
    res.json({ user: session.user })
  }

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    // Generous, because many students share a campus IP.
    if (req.method === 'POST') limiter.hit(`ip:${req.ip}`, 300, 15)
    next()
  })

  router.post('/register', async (req, res) => {
    // Generous, because a whole lecture hall may sign up from one campus IP.
    limiter.hit(`register-ip:${req.ip}`, 100, 60)
    const username = read(req, 'username', usernameError).trim()
    const email = readEmail(req)
    const password = read(req, 'password', newPasswordError)
    if (req.body?.acceptTerms !== true) {
      throw new AppError(400, 'VALIDATION', 'Accept the Terms of Service to continue.', { field: 'acceptTerms' })
    }
    startSession(res.status(201), await auth.register(username, email, password))
  })

  router.post('/login', async (req, res) => {
    const email = readEmail(req)
    const password = read(req, 'password', currentPasswordError)
    startSession(res, await auth.login(email, password, req.body?.remember === true, req.ip ?? ''))
  })

  router.get('/session', async (req, res) => {
    res.json({ user: await auth.currentUser(sessionToken(req)) })
  })

  router.post('/logout', async (req, res) => {
    await auth.logout(sessionToken(req))
    res.clearCookie(cookieName, cookieOptions)
    res.status(204).end()
  })

  router.post('/verify-email', async (req, res) => {
    const user = await requireSession(req)
    limiter.hit(`verify:${user.id}`, 20, 15)
    const code = read(req, 'code', verifyCodeError).replace(/\s/g, '')
    res.json({ user: await auth.verifyEmail(user, code) })
  })

  router.post('/resend-verification', async (req, res) => {
    const user = await requireSession(req)
    res.status(202).json(await auth.resendVerification(user))
  })

  router.post('/forgot-password', async (req, res) => {
    res.status(202).json(await auth.forgotPassword(readEmail(req)))
  })

  router.post('/reset-password', async (req, res) => {
    await auth.resetPassword(readToken(req), read(req, 'password', newPasswordError))
    res.clearCookie(cookieName, cookieOptions)
    res.status(204).end()
  })

  return router
}
