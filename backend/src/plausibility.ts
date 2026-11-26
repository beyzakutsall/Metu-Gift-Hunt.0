import { mesafeMetre } from '../../3d-harita/js/konum.js'
import { MAX_SPEED_MPS, MIN_ACCURACY } from '../../shared/huntRules.js'
import { AppError } from './errors.js'
import type { Fix } from './input.js'

const FORGET_MS = 30 * 60_000

/**
 * Refuses readings no phone carried by a person could produce. A spoofer can still fake a slow, smooth
 * walk: the camera is the real proof. This only stops the cheap tricks, like jumping onto a building.
 * The last reading lives in memory and is never stored, like the rate limiter (one API process).
 */
export function createPlausibility(now: () => number = Date.now) {
  const last = new Map<string, Fix & { at: number }>()
  setInterval(() => {
    for (const [key, entry] of last) if (now() - entry.at > FORGET_MS) last.delete(key)
  }, 60_000).unref()

  return {
    check(key: string, fix: Fix) {
      if (fix.accuracy < MIN_ACCURACY) {
        throw new AppError(422, 'SUSPICIOUS_GPS', 'Your location reading looks unreal. Turn off any location apps and try again.', { field: 'location' })
      }
      const previous = last.get(key)
      const at = now()
      if (previous) {
        const seconds = Math.max(0, (at - previous.at) / 1000)
        const metres = mesafeMetre({ enlem: previous.latitude, boylam: previous.longitude }, { enlem: fix.latitude, boylam: fix.longitude })
        // GPS error on both readings is allowed for, so a jittery phone standing still is fine.
        if (metres > MAX_SPEED_MPS * seconds + previous.accuracy + fix.accuracy) {
          throw new AppError(422, 'TOO_FAST', 'Your location jumped too fast. Wait a few seconds and try again.', { field: 'location' })
        }
      }
      last.set(key, { ...fix, at })
    },
    forget: (key: string) => void last.delete(key),
  }
}
export type Plausibility = ReturnType<typeof createPlausibility>
