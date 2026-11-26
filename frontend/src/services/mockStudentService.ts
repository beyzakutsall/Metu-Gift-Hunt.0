import { DAILY_LIMITS } from '../../../shared/gameRules'
import type { ChapterId, CollectionItem, StudentService } from '../types/student'
import { authService } from './authService'
import { mockState } from './mockGameState'
import { MOCK_ITEMS, MOCK_REWARD_ID } from './mockCollection'

// UI development only. The demo account is part-way through; new mock accounts start empty.
const SIZES: [ChapterId, number][] = [['creatures', 5], ['nature', 4], ['student-life', 6], ['adventure', 1]]
const SLOTS = SIZES.flatMap(([chapter, size]) => Array<ChapterId>(size).fill(chapter))
const DAY = 86_400_000
const UTC_OFFSET = 3 * 3_600_000 // Turkey has no daylight saving time

export function createMockStudentService(): StudentService {
  return {
    async getProfile() {
      const user = await authService.getSession()
      const demo = user?.id === 'demo'
      const hidden = mockState.gifts.get(user?.id ?? '')?.length ?? 0
      const searched = mockState.searches.get(user?.id ?? '') ?? 0
      const won = mockState.found.has(user?.id ?? '')
      const items = SLOTS.map((chapter, index): CollectionItem => {
        const id = index + 1
        const find = MOCK_ITEMS.find((item) => item.id === id)
        return find && (id === MOCK_REWARD_ID ? won : demo)
          ? { ...find, foundAt: new Date().toISOString() }
          : { id, chapter, name: null, credit: null, foundAt: null }
      })
      return {
        searches: { today: searched + (demo ? 1 : 0), limit: DAILY_LIMITS.search, total: searched + (demo ? 9 : 0) },
        hides: { today: hidden + (demo ? 1 : 0), limit: DAILY_LIMITS.hide, total: hidden + (demo ? 12 : 0) },
        resetsAt: new Date(Math.ceil((Date.now() + UTC_OFFSET) / DAY) * DAY - UTC_OFFSET).toISOString(),
        items,
      }
    },
  }
}
