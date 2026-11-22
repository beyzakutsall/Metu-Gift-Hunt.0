import { DAILY_LIMITS } from '../../../shared/gameRules'
import { MAX_WRONG_ANSWERS, arrivalRadius } from '../../../shared/huntRules'
import { mesafeMetre } from '../../../3d-harita/js/konum.js'
import { AuthError } from '../types/auth'
import type { Hunt, HuntService } from '../types/hunt'
import { authService } from './authService'
import { MOCK_ITEMS, MOCK_REWARD_ID } from './mockCollection'
import { mockState } from './mockGameState'

// UI development only: one sample gift in Matematik. The answer is "Cahit Arf".
const LOCATION = { key: 'way/56753995', name: 'Matematik', fullName: 'Matematik Bölümü', latitude: 39.895664, longitude: 32.782291 }
// A function, because top-level work would keep the sample items in normal builds.
const reward = () => ({ item: MOCK_ITEMS.find((item) => item.id === MOCK_REWARD_ID)!, note: 'You found the sample gift!' })

export function createMockHuntService(): HuntService {
  const hunts = new Map<string, Hunt>()

  async function userId() {
    const user = await authService.getSession()
    if (!user) throw new AuthError('UNAUTHENTICATED', 'Please log in again.')
    return user.id
  }

  return {
    async current() {
      const id = await userId()
      return { hunt: hunts.get(id) ?? null, available: !mockState.found.has(id) }
    },

    async start() {
      const id = await userId()
      const used = (mockState.searches.get(id) ?? 0) + (id === 'demo' ? 1 : 0)
      if (used >= DAILY_LIMITS.search) throw new AuthError('DAILY_LIMIT', 'You’ve used today’s searches.')
      mockState.searches.set(id, (mockState.searches.get(id) ?? 0) + 1)
      const hunt: Hunt = {
        id: crypto.randomUUID(),
        location: LOCATION,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        arrived: false,
        clue: null,
        riddle: null,
        attemptsLeft: MAX_WRONG_ANSWERS,
      }
      hunts.set(id, hunt)
      return hunt
    },

    async checkIn(_id, fix) {
      const id = await userId()
      let hunt = hunts.get(id)!
      const toCentre = mesafeMetre(
        { enlem: fix.latitude, boylam: fix.longitude },
        { enlem: LOCATION.latitude, boylam: LOCATION.longitude },
      )
      const distance = Math.max(0, Math.round((toCentre - 30) / 10) * 10)
      if (distance <= arrivalRadius(fix.accuracy)) {
        hunt = { ...hunt, arrived: true, clue: 'On the third floor', riddle: 'In which hall is the big event held?' }
        hunts.set(id, hunt)
      }
      return { hunt, distance, accurate: true }
    },

    async solve(_id, input) {
      const id = await userId()
      const hunt = hunts.get(id)!
      if (!/cahit\s*arf/i.test(input.answer)) {
        const left = hunt.attemptsLeft - 1
        if (left <= 0) {
          hunts.delete(id)
          throw new AuthError('HUNT_FAILED', 'That was your last try.')
        }
        hunts.set(id, { ...hunt, attemptsLeft: left })
        throw new AuthError('WRONG_ANSWER', `Not quite. ${left} tries left.`, 'answer')
      }
      hunts.delete(id)
      mockState.found.add(id)
      return reward()
    },

    async giveUp() {
      hunts.delete(await userId())
    },
  }
}
