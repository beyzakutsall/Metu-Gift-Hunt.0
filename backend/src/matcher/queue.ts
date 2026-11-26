import { AppError } from '../errors.js'

// Matching is CPU work on a small free server. A few at a time, a short line, and a polite "busy" beyond
// that, so one crowd of cameras can't stall logins and the rest of the API.
export function createMatchQueue(running = 2, waiting = 8) {
  let active = 0
  const line: (() => void)[] = []

  return async function run<T>(work: () => Promise<T>): Promise<T> {
    if (active >= running) {
      if (line.length >= waiting) throw new AppError(503, 'BUSY', 'Lots of people are hunting right now. Hold the camera steady, we’ll try again.')
      await new Promise<void>((resolve) => line.push(resolve))
    }
    active++
    try {
      return await work()
    } finally {
      active--
      line.shift()?.()
    }
  }
}
export type MatchQueue = ReturnType<typeof createMatchQueue>
