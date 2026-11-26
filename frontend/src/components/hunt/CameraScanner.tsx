import { Camera, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FIX_MAX_AGE_MS, FRAME_INTERVAL_MS, MATCH_EDGE } from '../../../../shared/huntRules'
import type { TimedFix } from '../../hooks/useGeolocation'
import { huntService } from '../../services/huntService'
import { AuthError } from '../../types/auth'
import type { Hunt, Reward } from '../../types/hunt'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

interface Props {
  hunt: Hunt
  fix: TimedFix | null
  onSolved: (reward: Reward) => void
  onFrames: (framesTried: number) => void
  onEnded: (message: string) => void
}

const ENDED = ['HUNT_ENDED', 'HUNT_FAILED', 'NOT_FOUND', 'UNAUTHENTICATED']
const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: 'Camera permission is off. Allow it in your browser settings, then try again.',
  NotFoundError: 'This device has no camera we can use.',
  NotReadableError: 'Another app is using the camera. Close it and try again.',
}

/** A live frame, shrunk to the size the server matches at. Never a file from the gallery. */
async function capture(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const scale = Math.min(1, MATCH_EDGE / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
  const url = canvas.toDataURL('image/jpeg', 0.8)
  return url.slice(url.indexOf(',') + 1)
}

export function CameraScanner({ hunt, fix, onSolved, onFrames, onEnded }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const latestFix = useRef(fix)
  latestFix.current = fix
  const [on, setOn] = useState(false)
  const [streak, setStreak] = useState({ now: 0, needed: 2 })
  const [problem, setProblem] = useState('')

  // The callbacks change on every render of the page. The loop reads the newest ones.
  const callbacks = useRef({ onSolved, onFrames, onEnded })
  callbacks.current = { onSolved, onFrames, onEnded }

  useEffect(() => {
    if (!on) return
    let stopped = false
    let stream: MediaStream | null = null

    async function loop() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
      } catch (caught) {
        setProblem(CAMERA_ERRORS[(caught as Error).name] ?? 'We couldn’t open the camera.')
        setOn(false)
        return
      }
      if (stopped) return
      video.current!.srcObject = stream
      await video.current!.play().catch(() => {})

      while (!stopped) {
        // One frame at a time: the next waits for the answer, so a slow server is never flooded.
        await new Promise((resolve) => setTimeout(resolve, FRAME_INTERVAL_MS))
        if (stopped || !video.current?.videoWidth) continue
        const reading = latestFix.current
        if (!reading || Date.now() - reading.time > FIX_MAX_AGE_MS) {
          setProblem('Waiting for your location…')
          continue
        }
        try {
          const frame = await capture(video.current, canvas.current!)
          const { latitude, longitude, accuracy } = reading
          const result = await huntService.frame(hunt.id, { latitude, longitude, accuracy, frame })
          if (stopped) return
          if (result.found) {
            callbacks.current.onSolved(result.found)
            return
          }
          setProblem('')
          setStreak({ now: result.streak, needed: result.needed })
          callbacks.current.onFrames(result.framesTried)
        } catch (caught) {
          if (stopped) return
          if (caught instanceof AuthError && ENDED.includes(caught.code)) {
            callbacks.current.onEnded(caught.message)
            return
          }
          // Busy server, a jumpy GPS reading or a dropped connection: say so and keep going.
          setProblem(caught instanceof AuthError ? caught.message : 'Connection trouble. Still trying…')
        }
      }
    }

    void loop()
    return () => {
      stopped = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [on, hunt.id])

  return (
    <section aria-labelledby="camera-heading" className="space-y-2">
      <h2 id="camera-heading" className="flex items-center gap-2 text-base">
        <ScanSearch className="size-5" aria-hidden />
        Find the spot with your camera
      </h2>
      {on ? (
        <>
          <div className="relative overflow-hidden rounded-control bg-ink">
            <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover" />
            <p
              aria-live="polite"
              className={`absolute inset-x-2 bottom-2 rounded-control px-3 py-2 text-center text-caption font-bold ${
                streak.now ? 'bg-sun text-ink' : 'bg-ink/80 text-white'
              }`}
            >
              {streak.now ? `Getting it… hold steady (${streak.now}/${streak.needed})` : 'Point the camera at the spot from the clue'}
            </p>
          </div>
          <canvas ref={canvas} hidden />
          {problem && <Alert tone="info">{problem}</Alert>}
          <Button variant="secondary" onClick={() => setOn(false)}>Stop the camera</Button>
        </>
      ) : (
        <>
          {problem && <Alert tone="error">{problem}</Alert>}
          <Button
            onClick={() => {
              setProblem('')
              setOn(true)
            }}
          >
            <Camera className="size-5" aria-hidden />
            Open the camera
          </Button>
          <p className="text-caption text-ink-soft">
            Stand where the hider stood and look around slowly. The gift appears when the camera recognises the spot.
          </p>
        </>
      )}
    </section>
  )
}
