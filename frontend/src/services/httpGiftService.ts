import type { Gift, GiftService } from '../types/gift'
import { request } from './http'

export function createHttpGiftService(): GiftService {
  return {
    listMine: async () => (await request<{ gifts: Gift[] }>('gifts/mine')).gifts,
    hide: async (input) => (await request<{ gift: Gift }>('gifts', input)).gift,
    addPuzzle: async (id, input) => (await request<{ gift: Gift }>(`gifts/${id}/puzzle`, input)).gift,
  }
}
