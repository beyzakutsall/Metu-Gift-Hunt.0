import type { GiftService } from '../types/gift'
import { createHttpGiftService } from './httpGiftService'
import { createMockGiftService } from './mockGiftService'

export const giftService: GiftService =
  import.meta.env.MODE === 'mock' ? createMockGiftService() : createHttpGiftService()
