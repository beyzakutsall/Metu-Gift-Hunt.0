import type { HuntService } from '../types/hunt'
import { createHttpHuntService } from './httpHuntService'
import { createMockHuntService } from './mockHuntService'

export const huntService: HuntService =
  import.meta.env.MODE === 'mock' ? createMockHuntService() : createHttpHuntService()
