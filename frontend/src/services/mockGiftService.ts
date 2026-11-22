import { DAILY_LIMITS } from '../../../shared/gameRules'
import { cleanNote } from '../../../shared/giftRules'
import { AuthError } from '../types/auth'
import type { Gift, GiftService } from '../types/gift'
import { authService } from './authService'
import { mockState } from './mockGameState'

async function currentUserId() {
  const user = await authService.getSession()
  if (!user) throw new AuthError('UNAUTHENTICATED', 'Please log in again.')
  return user.id
}

export function createMockGiftService(): GiftService {
  return {
    listMine: async () => [...(mockState.gifts.get(await currentUserId()) ?? [])],

    async hide({ requestId, latitude, longitude, note }) {
      const userId = await currentUserId()
      await new Promise((resolve) => setTimeout(resolve, 500))
      const gifts = mockState.gifts.get(userId) ?? []
      const usedBefore = userId === 'demo' ? 1 : 0 // the demo account's sample activity
      if (gifts.length + usedBefore >= DAILY_LIMITS.hide) {
        throw new AuthError('DAILY_LIMIT', 'You’ve hidden all of today’s gifts. Come back after midnight.')
      }
      const createdAt = new Date().toISOString()
      const gift: Gift = { id: requestId, latitude, longitude, note: cleanNote(note), createdAt }
      mockState.gifts.set(userId, [gift, ...gifts])

      const event = { id: mockState.notifications.length + 1, createdAt, mine: true }
      mockState.notifications.unshift({ ...event, read: true })
      mockState.listeners.forEach((listener) => listener(event))
      return gift
    },
  }
}
