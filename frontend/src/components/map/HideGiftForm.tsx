import { useRef, useState, type FormEvent } from 'react'
import { NOTE_MAX, noteError } from '../../../../shared/giftRules'
import { useAuth } from '../../context/authState'
import { giftService } from '../../services/giftService'
import { AuthError } from '../../types/auth'
import type { Gift } from '../../types/gift'
import type { CampusMapApi, MapPoint } from '../../types/map'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { TextArea } from '../common/TextArea'
import { PlacePicker } from './PlacePicker'
import { EMPTY_PUZZLE, PuzzleFields, validatePuzzle } from './PuzzleFields'

interface Props {
  map: CampusMapApi | null
  place: MapPoint | null
  placeError: string
  onPick: (point: MapPoint) => void
  onPlaceError: (message: string) => void
  onHidden: (gift: Gift) => void
  onLimit: () => void
}

const EMPTY = { ...EMPTY_PUZZLE, note: '' }
type Field = keyof typeof EMPTY

export function HideGiftForm({ map, place, placeError, onPick, onPlaceError, onHidden, onLimit }: Props) {
  const { setUser } = useAuth()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  // Retrying the same draft reuses its id, so a lost response can't hide two gifts.
  const draft = useRef({ key: '', id: '' })

  function change(field: Field, value: string) {
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
    const invalid: Partial<Record<Field, string>> = { ...validatePuzzle(values), note: noteError(values.note) }
    setErrors(invalid)
    const first = (Object.keys(invalid) as Field[]).find((field) => invalid[field])
    if (first) {
      document.getElementById(first)?.focus()
      return
    }

    const key = JSON.stringify([place.enlem, place.boylam, values])
    if (draft.current.key !== key) draft.current = { key, id: crypto.randomUUID() }

    inFlight.current = true
    setBusy(true)
    try {
      const gift = await giftService.hide({
        requestId: draft.current.id,
        latitude: place.enlem,
        longitude: place.boylam,
        ...values,
      })
      draft.current = { key: '', id: '' }
      setValues(EMPTY)
      onHidden(gift)
    } catch (caught) {
      if (!(caught instanceof AuthError)) setError('Something went wrong. Please try again.')
      else if (caught.code === 'UNAUTHENTICATED') setUser(null)
      else if (caught.field === 'place') onPlaceError(caught.message)
      else if (caught.field && caught.field in EMPTY) setErrors({ [caught.field]: caught.message })
      else {
        setError(caught.message)
        if (caught.code === 'DAILY_LIMIT') onLimit()
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={busy} className="space-y-field">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">Place</legend>
        <PlacePicker map={map} place={place} error={placeError} onPick={onPick} />
      </fieldset>
      <PuzzleFields value={values} errors={errors} readOnly={busy} onChange={change} />
      <TextArea
        id="note"
        label="5. Note for the finder"
        placeholder="A message for whoever finds it"
        hint="Shown after they solve it."
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
