import type { Request } from 'express'
import type { AuthService } from './authService.js'
import { AppError } from './errors.js'
import type { SessionCookie } from './sessionCookie.js'

export function createRequireUser(auth: AuthService, cookie: SessionCookie) {
  return async (req: Request) => {
    const user = await auth.currentUser(cookie.read(req))
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in again.')
    return user
  }
}
export type RequireUser = ReturnType<typeof createRequireUser>
