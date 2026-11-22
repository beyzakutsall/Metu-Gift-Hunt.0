import { useEffect, useState } from 'react'
import { konumuIzle, type KonumHatasi } from '../../../3d-harita/js/konum.js'
import { SOLVE_MAX_ACCURACY } from '../../../shared/huntRules'
import type { Fix } from '../types/hunt'

export interface TimedFix extends Fix {
  time: number
}

// Her reader reports in Turkish. This app is in English, so translate by code.
const MESSAGES: Record<KonumHatasi['kod'], string> = {
  'guvenli-degil': 'Location only works over HTTPS.',
  desteklenmiyor: 'This browser can’t share your location.',
  'izin-yok': 'Location permission is off. Allow it in your browser settings, then try again.',
  'konum-yok': 'We can’t get your location. Are location services on?',
  'zaman-asimi': 'GPS is taking a while. Step outside or near a window.',
  bilinmiyor: 'We can’t get your location right now.',
}
const FATAL = new Set<KonumHatasi['kod']>(['guvenli-degil', 'desteklenmiyor', 'izin-yok'])

/** Off until start(), so the permission prompt follows a tap. Stops with the page. */
export function useGeolocation() {
  const [watching, setWatching] = useState(false)
  const [fix, setFix] = useState<TimedFix | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!watching) return
    return konumuIzle({
      enKotuDogruluk: SOLVE_MAX_ACCURACY,
      konum: ({ enlem, boylam, dogruluk }) => {
        setError('')
        setFix({ latitude: enlem, longitude: boylam, accuracy: dogruluk, time: Date.now() })
      },
      zayif: (accuracy) => setError(`GPS signal is weak (±${Math.round(accuracy)} m). Waiting for a better one…`),
      hata: ({ kod }) => {
        setError(MESSAGES[kod])
        if (FATAL.has(kod)) setWatching(false)
      },
    })
  }, [watching])

  return {
    fix,
    error,
    watching,
    start() {
      setError('')
      setWatching(true)
    },
    /** For the development test panel. */
    simulate(next: Fix) {
      setWatching(false)
      setError('')
      setFix({ ...next, time: Date.now() })
    },
  }
}
export type Geolocation = ReturnType<typeof useGeolocation>
