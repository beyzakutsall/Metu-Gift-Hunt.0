import { Router } from 'express'
import type { AuthService } from './authService.js'
import { AppError } from './errors.js'
import type { SessionCookie } from './sessionCookie.js'
import type { StudentService } from './studentService.js'

export function createStudentRoutes(auth: AuthService, students: StudentService, cookie: SessionCookie) {
  const router = Router()

  router.get('/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const user = await auth.currentUser(cookie.read(req))
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please log in again.')
    // The user always comes from the session, never from the request.
    res.json(await students.profile(user.id))
  })

  return router
}
