import { LocateFixed } from 'lucide-react'
import type { Geolocation } from '../../hooks/useGeolocation'
import type { CheckIn } from '../../types/hunt'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

interface Props {
  geo: Geolocation
  arrived: boolean
  result: CheckIn | null
  error: string
}

export function LocationStatus({ geo, arrived, result, error }: Props) {
  const { fix, watching } = geo
  function text() {
    if (!fix) return 'Waiting for GPS…'
    if (arrived) return `Location on (±${Math.round(fix.accuracy)} m)`
    if (!result) return 'Checking how close you are…'
    if (!result.accurate) return `GPS is too imprecise (±${Math.round(fix.accuracy)} m). Step into the open.`
    return result.distance ? `About ${result.distance} m to go` : 'You’re almost there'
  }

  return (
    <div className="space-y-2">
      {watching || fix ? (
        <p role="status" className="flex min-h-11 items-center gap-2 rounded-control bg-mint px-3 py-2 text-caption font-bold">
          <LocateFixed className="size-4 shrink-0" aria-hidden />
          {text()}
        </p>
      ) : (
        <>
          <Button onClick={geo.start}>
            <LocateFixed className="size-5" aria-hidden />
            Use my location
          </Button>
          <p className="text-caption text-ink-soft">
            {arrived ? 'Needed to send your answer.' : 'Needed to unlock the clue.'} Your position is checked, never saved.
          </p>
        </>
      )}
      {(geo.error || error) && <Alert tone="error">{geo.error || error}</Alert>}
    </div>
  )
}
