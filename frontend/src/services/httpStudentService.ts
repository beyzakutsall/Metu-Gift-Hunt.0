import type { StudentService } from '../types/student'
import { request } from './http'

export function createHttpStudentService(): StudentService {
  return { getProfile: () => request('student/profile') }
}
