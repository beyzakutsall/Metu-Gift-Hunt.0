import { CircleAlert, MapPin } from 'lucide-react'
import type { CampusMapApi, MapPoint } from '../../types/map'

interface Props {
  map: CampusMapApi | null
  place: MapPoint | null
  error: string
  onPick: (point: MapPoint) => void
}

export function PlacePicker({ map, place, error, onPick }: Props) {
  const location = place && map?.anaKonum(place.enlem, place.boylam)
  const buildings = map?.yerler ?? []
  // Two buildings can share a short name, like Havacılık.
  const labels = buildings.map(({ ad }, index) => {
    const same = buildings.filter((building) => building.ad === ad)
    return same.length > 1 ? `${ad} (${same.indexOf(buildings[index]!) + 1})` : ad
  })

  return (
    <div className="space-y-2">
      <label htmlFor="landmark" className="block text-caption font-bold">
        1. Choose the main location
      </label>
      <p className="text-caption text-ink-soft">Pick a building, or tap a spot in or beside one.</p>
      <select
        id="landmark"
        value=""
        disabled={!map}
        aria-describedby="place-status"
        onChange={(event) => {
          const chosen = buildings[Number(event.target.value)]
          if (chosen) onPick(chosen)
        }}
        className="h-touch w-full rounded-control border border-edge bg-surface px-3 disabled:opacity-60"
      >
        <option value="" disabled>
          Jump to a building…
        </option>
        {buildings.map(({ anahtar }, index) => (
          <option key={anahtar} value={index}>
            {labels[index]}
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
          {error || (location ? `${location.icinde ? 'Inside' : 'Next to'} ${location.tamAd}` : 'No place selected yet.')}
        </span>
      </p>
    </div>
  )
}
