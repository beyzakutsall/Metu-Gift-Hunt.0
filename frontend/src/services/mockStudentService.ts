import { DAILY_LIMITS } from '../../../shared/gameRules'
import type { ChapterId, CollectionItem, StudentService } from '../types/student'
import { authService } from './authService'
import { mockState } from './mockGameState'

// UI development only. The demo account is part-way through; new mock accounts start empty.
const CHAPTERS: ChapterId[] = ['creatures', 'nature', 'student-life', 'adventure']
const SAMPLE_FINDS = new Map([
  [1, ['Campus Cat', '🐱']],
  [3, ['Night Owl', '🦉']],
  [7, ['Tall Pine', '🌲']],
  [14, ['Endless Coffee', '☕']],
  [19, ['Pathfinder', '🧭']],
])
const DAY = 86_400_000
const UTC_OFFSET = 3 * 3_600_000 // Turkey has no daylight saving time

export function createMockStudentService(): StudentService {
  return {
    async getProfile() {
      const user = await authService.getSession()
      const demo = user?.id === 'demo'
      const hidden = mockState.gifts.get(user?.id ?? '')?.length ?? 0
      const items = Array.from({ length: 24 }, (_, index): CollectionItem => {
        const id = index + 1
        const chapter = CHAPTERS[Math.floor(index / 6)]!
        const find = demo ? SAMPLE_FINDS.get(id) : undefined
        return find
          ? { id, chapter, name: find[0]!, emoji: find[1]!, foundAt: new Date().toISOString() }
          : { id, chapter, name: null, emoji: null, foundAt: null }
      })
      return {
        searches: { today: demo ? 1 : 0, limit: DAILY_LIMITS.search, total: demo ? 9 : 0 },
        hides: { today: hidden + (demo ? 1 : 0), limit: DAILY_LIMITS.hide, total: hidden + (demo ? 12 : 0) },
        resetsAt: new Date(Math.ceil((Date.now() + UTC_OFFSET) / DAY) * DAY - UTC_OFFSET).toISOString(),
        items,
      }
    },
  }
}
