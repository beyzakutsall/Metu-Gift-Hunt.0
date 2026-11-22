import { useRef, useState, type FormEvent } from 'react'
import { NOTE_MAX, noteError } from '../../../../shared/giftRules'
import { useAuth } from '../../context/AuthContext'
import { giftService } from '../../services/giftService'
import { AuthError } from '../../types/auth'
import type { Gift } from '../../types/gift'
import type { CampusMapApi, MapPoint } from '../../types/map'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { PlacePicker } from './PlacePicker'

interface Props {
  map: CampusMapApi | null
  place: MapPoint | null
  placeError: string
  onPick: (point: MapPoint) => void
  onPlaceError: (message: string) => void
  onHidden: (gift: Gift) => void
  onLimit: () => void
}

export function HideGiftForm({ map, place, placeError, onPick, onPlaceError, onHidden, onLimit }: Props) {
  const { setUser } = useAuth()
  const [note, setNote] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const noteField = useRef<HTMLTextAreaElement>(null)
  // Retrying the same draft reuses its id, so a lost response can't hide two gifts.
  const draft = useRef({ key: '', id: '' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    setError('')
    if (!place) {
      onPlaceError(placeError || 'Choose a place on the map first.')
      document.getElementById('landmark')?.focus()
      return
    }
    const invalid = noteError(note)
    if (invalid) {
      setFieldError(invalid)
      noteField.current?.focus()
      return
    }

    const key = JSON.stringify([place.enlem, place.boylam, note])
    if (draft.current.key !== key) draft.current = { key, id: crypto.randomUUID() }

    inFlight.current = true
    setBusy(true)
    try {
      const gift = await giftService.hide({
        requestId: draft.current.id,
        latitude: place.enlem,
        longitude: place.boylam,
        note,
      })
      draft.current = { key: '', id: '' }
      setNote('')
      onHidden(gift)
    } catch (caught) {
      if (!(caught instanceof AuthError)) setError('Something went wrong. Please try again.')
      else if (caught.code === 'UNAUTHENTICATED') setUser(null)
      else if (caught.field === 'note') setFieldError(caught.message)
      else if (caught.field === 'place') onPlaceError(caught.message)
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

      <div>
        <label htmlFor="note" className="mb-1.5 block text-caption font-bold">
          2. Leave a note
        </label>
        <textarea
          ref={noteField}
          id="note"
          rows={3}
          value={note}
          maxLength={NOTE_MAX}
          readOnly={busy}
          required
          placeholder="A message for whoever finds it"
          aria-invalid={Boolean(fieldError)}
          aria-describedby="note-help"
          onChange={(event) => {
            setNote(event.target.value)
            setFieldError('')
            setError('')
          }}
          className={`block w-full resize-y rounded-control border bg-surface p-3 placeholder:text-ink-soft ${
            fieldError ? 'border-danger' : 'border-edge'
          }`}
        />
        <p id="note-help" className="mt-1 flex justify-between gap-3 text-caption text-ink-soft">
          <span className={fieldError ? 'text-danger' : ''}>{fieldError || 'Only the finder will see it.'}</span>
          <span className="shrink-0">
            {note.length}/{NOTE_MAX}
          </span>
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={busy}>
        {busy ? 'Hiding…' : 'Hide gift and notify everyone'}
      </Button>
    </form>
  )
}
