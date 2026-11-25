import type { Request } from 'express'
import type { AuthService } from './authService.js'
import { AppError } from './errors.js'
import type { SessionCookie } from './sessionCookie.js'

/** Any signed-in student, verified or not. Only the auth routes need this. */
export function createRequireSession(auth: AuthService, cookie: SessionCookie) {
  return async (req: Request) => {
    const user = await auth.currentUser(cookie.read(req))
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in again.')
    return user
  }
}

/** A student who has proved their METU inbox. Every game route uses this. */
export function createRequireUser(auth: AuthService, cookie: SessionCookie) {
  const requireSession = createRequireSession(auth, cookie)
  return async (req: Request) => {
    const user = await requireSession(req)
    if (!user.verified) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Enter the code we emailed you to start playing.')
    return user
  }
}
export type RequireUser = ReturnType<typeof createRequireUser>
