import { useEffect, useRef, useState } from 'react'
import { huntService } from '../services/huntService'
import { AuthError } from '../types/auth'
import type { CheckIn, Hunt } from '../types/hunt'
import type { TimedFix } from './useGeolocation'

const INTERVAL_MS = 3000

/** Reports readings to the server until it agrees the student has arrived. */
export function useCheckIn(hunt: Hunt | null, fix: TimedFix | null, onChange: (hunt: Hunt) => void, onEnded: () => void) {
  const [result, setResult] = useState<CheckIn | null>(null)
  const [error, setError] = useState('')
  const lastSent = useRef(0)
  const id = hunt && !hunt.arrived ? hunt.id : null

  useEffect(() => {
    if (!id || !fix) return
    let current = true
    // At most every few seconds, and always the newest reading.
    const timer = setTimeout(
      async () => {
        lastSent.current = Date.now()
        try {
          const next = await huntService.checkIn(id, { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy })
          // An arrival counts even if a newer reading has started since.
          if (!current && !next.hunt.arrived) return
          setResult(next)
          setError('')
          if (next.hunt.arrived) onChange(next.hunt)
        } catch (caught) {
          if (caught instanceof AuthError && ['HUNT_ENDED', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(caught.code)) onEnded()
          else if (current) setError(caught instanceof AuthError ? caught.message : 'We couldn’t check your position.')
        }
      },
      Math.max(0, lastSent.current + INTERVAL_MS - Date.now()),
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [id, fix, onChange, onEnded])

  // A result from an earlier hunt says nothing about this one.
  return { result: result?.hunt.id === id ? result : null, error }
}
