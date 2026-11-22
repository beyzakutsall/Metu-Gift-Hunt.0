import { Router } from 'express'
import type { RequireUser } from './requireUser.js'
import type { StudentService } from './studentService.js'

export function createStudentRoutes(requireUser: RequireUser, students: StudentService) {
  const router = Router()

  router.get('/profile', async (req, res) => {
    res.set('Cache-Control', 'no-store')
    // The user always comes from the session, never from the request.
    const user = await requireUser(req)
    res.json(await students.profile(user.id))
  })

  return router
}
