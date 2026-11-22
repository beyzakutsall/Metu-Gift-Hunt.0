import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CampusMapApi } from '../../types/map'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

type MapWindow = Window & { kampusHarita?: CampusMapApi; haritaHatasi?: string }

const TIMEOUT_MS = 45_000

/**
 * Her engine runs full-window and has no teardown, so it gets an iframe: removing the iframe frees
 * the WebGL context, the render loop and every listener.
 */
export function CampusMap({ onReady }: { onReady: (api: CampusMapApi | null) => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const element = frame.current!
    let watched: MapWindow | undefined
    const timer = setTimeout(() => setStatus('failed'), TIMEOUT_MS)

    function check() {
      if (watched?.kampusHarita) {
        clearTimeout(timer)
        setStatus('ready')
        onReady(watched.kampusHarita)
      } else if (watched?.haritaHatasi) {
        clearTimeout(timer)
        setStatus('failed')
      }
    }
    function watch() {
      watched = element.contentWindow as MapWindow
      watched.addEventListener('harita-hazir', check)
      watched.addEventListener('harita-hata', check)
      check() // it may have finished already
    }

    element.addEventListener('load', watch)
    // src is set here, so the load event can't fire before the listener exists.
    element.src = '/3d-harita/minecraft.html'
    return () => {
      clearTimeout(timer)
      element.removeEventListener('load', watch)
      watched?.removeEventListener('harita-hazir', check)
      watched?.removeEventListener('harita-hata', check)
      onReady(null)
    }
  }, [attempt, onReady])

  return (
    <div className="relative size-full overflow-hidden bg-sky">
      <iframe key={attempt} ref={frame} title="3D map of the METU campus" className="block size-full border-0" />
      {status === 'loading' && (
        <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-mint font-bold">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Building the campus…
        </p>
      )}
      {status === 'failed' && (
        <div className="absolute inset-0 grid place-items-center bg-mint p-gutter">
          <div className="max-w-sm space-y-3">
            <Alert tone="error">The map couldn’t load. It needs an internet connection and WebGL.</Alert>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('loading')
                setAttempt(attempt + 1)
              }}
            >
              Reload the map
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
