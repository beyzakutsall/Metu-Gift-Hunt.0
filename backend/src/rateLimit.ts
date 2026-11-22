import { AppError } from './errors.js'

// In memory, which suits one API process. Move to a shared store before running several.
export function createRateLimiter() {
  const windows = new Map<string, { count: number; resetsAt: number }>()
  setInterval(() => {
    for (const [key, entry] of windows) if (entry.resetsAt <= Date.now()) windows.delete(key)
  }, 60_000).unref()

  return {
    hit(key: string, max: number, minutes: number) {
      let entry = windows.get(key)
      if (!entry || entry.resetsAt <= Date.now()) {
        entry = { count: 0, resetsAt: Date.now() + minutes * 60_000 }
        windows.set(key, entry)
      }
      if (++entry.count > max) {
        const wait = Math.ceil((entry.resetsAt - Date.now()) / 60_000)
        throw new AppError(429, 'RATE_LIMITED', `Too many attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.`)
      }
    },
    clear: (key: string) => void windows.delete(key),
  }
}
export type RateLimiter = ReturnType<typeof createRateLimiter>
