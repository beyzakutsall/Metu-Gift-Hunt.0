import type { StudentService } from '../types/student'
import { createHttpStudentService } from './httpStudentService'
import { createMockStudentService } from './mockStudentService'

export const studentService: StudentService =
  import.meta.env.MODE === 'mock' ? createMockStudentService() : createHttpStudentService()
