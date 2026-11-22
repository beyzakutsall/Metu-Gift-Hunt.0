import { CircleAlert, MapPin } from 'lucide-react'
import type { CampusMapApi, MapPoint } from '../../types/map'

interface Props {
  map: CampusMapApi | null
  place: MapPoint | null
  error: string
  onPick: (point: MapPoint) => void
}

export function PlacePicker({ map, place, error, onPick }: Props) {
  const near = place && map?.yakinYer(place.enlem, place.boylam)
  return (
    <div className="space-y-2">
      <label htmlFor="landmark" className="block text-caption font-bold">
        1. Choose a place
      </label>
      <p className="text-caption text-ink-soft">Tap the map, or start from a building and adjust.</p>
      <select
        id="landmark"
        value=""
        disabled={!map}
        aria-describedby="place-status"
        onChange={(event) => {
          const chosen = map?.yerler[Number(event.target.value)]
          if (chosen) onPick(chosen)
        }}
        className="h-touch w-full rounded-control border border-edge bg-surface px-3 disabled:opacity-60"
      >
        <option value="" disabled>
          Jump to a building…
        </option>
        {map?.yerler.map(({ ad }, index) => (
          <option key={ad} value={index}>
            {ad}
          </option>
        ))}
      </select>

      <p
        id="place-status"
        aria-live="polite"
        className={`flex min-h-12 items-center gap-2 rounded-control px-3 py-2.5 text-caption ${
          error ? 'bg-danger-soft text-danger' : place ? 'bg-mint font-bold' : 'bg-paper text-ink-soft'
        }`}
      >
        {error ? <CircleAlert className="size-4 shrink-0" aria-hidden /> : <MapPin className="size-4 shrink-0" aria-hidden />}
        <span className="min-w-0 break-words">
          {error ||
            (!place
              ? 'No place selected yet.'
              : near
                ? near.metre < 15
                  ? `Next to ${near.ad}`
                  : `${near.metre} m from ${near.ad}`
                : 'Place selected')}
        </span>
      </p>
    </div>
  )
}
