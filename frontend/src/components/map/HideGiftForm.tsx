import { LocateFixed } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { FLOOR_MAX, NOTE_MAX, floorError, noteError } from '../../../../shared/giftRules'
import { ARRIVE_MAX_ACCURACY, FIX_MAX_AGE_MS, SCENE_PHOTOS } from '../../../../shared/huntRules'
import { useAuth } from '../../context/authState'
import { useGeolocation } from '../../hooks/useGeolocation'
import { giftService } from '../../services/giftService'
import { AuthError } from '../../types/auth'
import type { Gift } from '../../types/gift'
import type { CampusMapApi, MapPoint } from '../../types/map'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { TextArea } from '../common/TextArea'
import { PlacePicker } from './PlacePicker'
import { EMPTY_PUZZLE, PuzzleFields, validatePuzzle } from './PuzzleFields'
import { ScenePhotos, type ScenePhoto } from './ScenePhotos'

interface Props {
  map: CampusMapApi | null
  place: MapPoint | null
  placeError: string
  onPick: (point: MapPoint) => void
  onPlaceError: (message: string) => void
  onHidden: (gift: Gift) => void
  onLimit: () => void
}

const EMPTY = { ...EMPTY_PUZZLE, note: '', floor: '' }
const NO_PHOTOS: (ScenePhoto | null)[] = Array(SCENE_PHOTOS).fill(null)
type Field = keyof typeof EMPTY | 'photos' | 'location'

export function HideGiftForm({ map, place, placeError, onPick, onPlaceError, onHidden, onLimit }: Props) {
  const { setUser } = useAuth()
  const geo = useGeolocation()
  const [values, setValues] = useState(EMPTY)
  const [photos, setPhotos] = useState(NO_PHOTOS)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  // Retrying the same draft reuses its id, so a lost response can't hide two gifts.
  const draft = useRef({ key: '', id: '' })

  function change(field: keyof typeof EMPTY, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    setError('')
    if (!place) {
      onPlaceError(placeError || 'Choose a place on the map first.')
      document.getElementById('landmark')?.focus()
      return
    }
    const fix = geo.fix && Date.now() - geo.fix.time <= FIX_MAX_AGE_MS ? geo.fix : null
    const invalid: Partial<Record<Field, string>> = {
      location: fix ? undefined : 'Turn on your location: you need to be at the building.',
      floor: floorError(values.floor),
      photos: photos.every(Boolean) ? undefined : `Take all ${SCENE_PHOTOS} photos of the spot.`,
      ...validatePuzzle(values),
      note: noteError(values.note),
    }
    setErrors(invalid)
    const first = (Object.keys(invalid) as Field[]).find((field) => invalid[field])
    if (first || !fix) {
      document.getElementById(first === 'location' ? 'locate' : (first ?? 'locate'))?.focus()
      return
    }

    const key = JSON.stringify([place.enlem, place.boylam, values, photos.map((photo) => photo!.base64.length)])
    if (draft.current.key !== key) draft.current = { key, id: crypto.randomUUID() }

    inFlight.current = true
    setBusy(true)
    try {
      const gift = await giftService.hide({
        requestId: draft.current.id,
        latitude: place.enlem,
        longitude: place.boylam,
        location: { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy },
        photos: photos.map((photo) => photo!.base64),
        ...values,
      })
      draft.current = { key: '', id: '' }
      setValues(EMPTY)
      setPhotos(NO_PHOTOS)
      onHidden(gift)
    } catch (caught) {
      if (!(caught instanceof AuthError)) setError('Something went wrong. Please try again.')
      else if (caught.code === 'UNAUTHENTICATED') setUser(null)
      else if (caught.field === 'place') onPlaceError(caught.message)
      else if (caught.field && (caught.field in EMPTY || caught.field === 'photos' || caught.field === 'location')) {
        setErrors({ [caught.field]: caught.message })
      } else {
        setError(caught.message)
        if (caught.code === 'DAILY_LIMIT') onLimit()
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const weak = geo.fix && geo.fix.accuracy > ARRIVE_MAX_ACCURACY

  return (
    <form noValidate onSubmit={submit} aria-busy={busy} className="space-y-field">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">Place</legend>
        <PlacePicker map={map} place={place} error={placeError} onPick={onPick} />
      </fieldset>

      <section aria-labelledby="at-spot" className="space-y-field rounded-control bg-paper p-3">
        <h3 id="at-spot" className="text-caption font-bold">2. At the spot</h3>
        <div>
          <Button
            id="locate"
            variant="secondary"
            onClick={geo.start}
            aria-describedby="locate-message"
            className={errors.location ? 'border-danger' : ''}
          >
            <LocateFixed className="size-4" aria-hidden />
            {geo.fix ? 'Location on' : 'Check that I’m here'}
          </Button>
          <p id="locate-message" aria-live="polite" className={`mt-1 text-caption ${errors.location || geo.error ? 'text-danger' : 'text-ink-soft'}`}>
            {errors.location ||
              geo.error ||
              (geo.fix
                ? weak
                  ? `GPS is weak (±${Math.round(geo.fix.accuracy)} m). Move near a window.`
                  : `Got it (±${Math.round(geo.fix.accuracy)} m).`
                : 'You need to be at the building to hide a gift there.')}
          </p>
        </div>
        <Input
          id="floor"
          label="Floor"
          placeholder="3rd floor"
          maxLength={FLOOR_MAX}
          value={values.floor}
          error={errors.floor}
          hint="Shown to the finder when they arrive."
          readOnly={busy}
          required
          onChange={(event) => change('floor', event.target.value)}
        />
        <ScenePhotos
          photos={photos}
          error={errors.photos}
          disabled={busy}
          onChange={(next, problem) => {
            setPhotos(next)
            setErrors((previous) => ({ ...previous, photos: problem }))
          }}
        />
      </section>

      <PuzzleFields step={3} value={values} errors={errors} readOnly={busy} onChange={change} />
      <TextArea
        id="note"
        label="6. Note for the finder"
        placeholder="A message for whoever finds it"
        hint="Shown after they find it."
        maxLength={NOTE_MAX}
        value={values.note}
        error={errors.note}
        readOnly={busy}
        required
        onChange={(event) => change('note', event.target.value)}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={busy}>
        {busy ? 'Hiding…' : 'Hide gift and notify everyone'}
      </Button>
    </form>
  )
}
