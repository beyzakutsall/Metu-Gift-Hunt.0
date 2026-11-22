import type { Registration } from '../types/auth'

export type Pending = Pick<Registration, 'registrationId' | 'email'> & Partial<Registration>

const KEY = 'cq:pending-registration'

// Lets the "check your inbox" screen survive a refresh. Never holds a password.
export function savePending(pending: Pending) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending))
  } catch {
    // Storage can be blocked; router state still carries it.
  }
}

export function loadPending(): Pending | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function clearPending() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing was stored.
  }
}
