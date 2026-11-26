import type { Gift, GiftService } from '../types/gift'
import { request } from './http'

export function createHttpGiftService(): GiftService {
  return {
    listMine: async () => (await request<{ gifts: Gift[] }>('gifts/mine')).gifts,
    // Three photos on a weak indoor signal can take a while.
    hide: async (input) => (await request<{ gift: Gift }>('gifts', input, 60_000)).gift,
    addPuzzle: async (id, input) => (await request<{ gift: Gift }>(`gifts/${id}/puzzle`, input)).gift,
  }
}
