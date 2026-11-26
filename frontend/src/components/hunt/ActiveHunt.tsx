import { Building2, Crosshair, Lightbulb, MapPin, Puzzle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { FALLBACK_MIN_FRAMES } from '../../../../shared/huntRules'
import type { Geolocation } from '../../hooks/useGeolocation'
import type { CheckIn, Hunt, Reward } from '../../types/hunt'
import type { CampusMapApi } from '../../types/map'
import { formatTime } from '../notifications/formatTime'
import { Button } from '../common/Button'
import { CameraScanner } from './CameraScanner'
import { GiveUp } from './GiveUp'
import { HuntSteps } from './HuntSteps'
import { LocationSimulator } from './LocationSimulator'
import { LocationStatus } from './LocationStatus'
import { SolveForm } from './SolveForm'

interface Props {
  hunt: Hunt
  map: CampusMapApi | null
  geo: Geolocation
  result: CheckIn | null
  error: string
  onSolved: (reward: Reward) => void
  onChanged: () => void
  /** Camera frames so far, so the riddle fallback can open without a reload. */
  onFrames: (framesTried: number) => void
  onEnded: (message: string) => void
}

export function ActiveHunt({ hunt, map, geo, result, error, onSolved, onChanged, onFrames, onEnded }: Props) {
  const { location, arrived } = hunt
  const clue = useRef<HTMLDivElement>(null)
  const wasArrived = useRef(arrived)

  useEffect(() => {
    // Only at the moment of arrival, not when reopening the page. It also scrolls a phone to it.
    if (arrived && !wasArrived.current) clue.current?.focus()
    wasArrived.current = arrived
  }, [arrived])

  return (
    <div className="space-y-field">
      <HuntSteps done={arrived ? 2 : 0} />

      <section aria-label="Main location" className="rounded-control bg-butter p-3">
        <h2 className="flex items-start gap-2 text-lg leading-tight">
          <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
          {location.fullName}
        </h2>
        <p className="mt-1 text-caption">
          {location.fullName !== location.name && `${location.name} · `}Yours until {formatTime(hunt.expiresAt)}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          disabled={!map}
          onClick={() => map?.odakla({ enlem: location.latitude, boylam: location.longitude })}
        >
          <MapPin className="size-4" aria-hidden />
          Building
        </Button>
        <Button variant="secondary" disabled={!map || !geo.fix} onClick={() => map?.oyuncuyaOdaklan()} className="disabled:opacity-50">
          <Crosshair className="size-4" aria-hidden />
          Me
        </Button>
      </div>

      <LocationStatus geo={geo} arrived={arrived} result={result} error={error} />

      {arrived ? (
        <>
          <div ref={clue} tabIndex={-1} className="rounded-control border-2 border-forest bg-mint p-3 focus:outline-none">
            <p className="text-caption font-bold">You’re here! The clue is unlocked.</p>
            {hunt.floor && (
              <>
                <h2 className="mt-2 flex items-center gap-2 text-base">
                  <Building2 className="size-4" aria-hidden />
                  Floor
                </h2>
                <p className="break-words">{hunt.floor}</p>
              </>
            )}
            <h2 className="mt-2 flex items-center gap-2 text-base">
              <Lightbulb className="size-4" aria-hidden />
              Clue
            </h2>
            <p className="break-words whitespace-pre-wrap">{hunt.clue}</p>
          </div>
          <CameraScanner key={hunt.id} hunt={hunt} fix={geo.fix} onSolved={onSolved} onFrames={onFrames} onEnded={onEnded} />
          {hunt.framesTried >= FALLBACK_MIN_FRAMES ? (
            <section aria-labelledby="riddle-heading" className="space-y-2 rounded-control bg-paper p-3">
              <h2 id="riddle-heading" className="flex items-center gap-2 text-base">
                <Puzzle className="size-4" aria-hidden />
                Camera can’t recognise it? Solve the riddle
              </h2>
              <p className="break-words whitespace-pre-wrap">{hunt.riddle}</p>
              <SolveForm key={hunt.id} hunt={hunt} fix={geo.fix} onSolved={onSolved} onChanged={onChanged} onEnded={onEnded} />
            </section>
          ) : (
            <p className="text-caption text-ink-soft">
              If the camera can’t recognise the spot, a riddle opens here after a little while as a backup.
            </p>
          )}
        </>
      ) : (
        <p className="flex items-center gap-2 rounded-control border-2 border-dashed border-line p-3 text-caption text-ink-soft">
          <Lightbulb className="size-4 shrink-0" aria-hidden />
          The clue and riddle unlock when you get close.
        </p>
      )}

      {import.meta.env.DEV && <LocationSimulator hunt={hunt} onSimulate={geo.simulate} />}
      <GiveUp huntId={hunt.id} onDone={() => onEnded('')} />
    </div>
  )
}
