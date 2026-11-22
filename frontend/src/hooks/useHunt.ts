import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/authState'
import { huntService } from '../services/huntService'
import { AuthError } from '../types/auth'
import type { Hunt } from '../types/hunt'

export function useHunt() {
  const { setUser } = useAuth()
  const [hunt, setHunt] = useState<Hunt | null>(null)
  const [available, setAvailable] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const version = useRef(0)

  /** Local changes win over any response that was requested before them. */
  const update = useCallback((next: Hunt | null) => {
    version.current++
    setHunt(next)
  }, [])

  const refresh = useCallback(async () => {
    const current = ++version.current
    try {
      const next = await huntService.current()
      if (current !== version.current) return
      setHunt(next.hunt)
      setAvailable(next.available)
      setLoaded(true)
      setError('')
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === 'UNAUTHENTICATED') setUser(null)
      else if (current === version.current) setError('We couldn’t load your hunt.')
    }
  }, [setUser])

  useEffect(() => {
    void refresh()
    // Also runs on return from the camera app. The same hunt keeps its form and photo.
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { hunt, available, loaded, error, update, refresh }
}
