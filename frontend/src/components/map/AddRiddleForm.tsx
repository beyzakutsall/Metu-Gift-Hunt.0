import { useRef, useState, type FormEvent } from 'react'
import { giftService } from '../../services/giftService'
import { AuthError } from '../../types/auth'
import type { Gift, PuzzleInput } from '../../types/gift'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { EMPTY_PUZZLE, PuzzleFields, validatePuzzle, type PuzzleErrors } from './PuzzleFields'

export function AddRiddleForm({ gift, onSaved }: { gift: Gift; onSaved: (gift: Gift) => void }) {
  const [values, setValues] = useState(EMPTY_PUZZLE)
  const [errors, setErrors] = useState<PuzzleErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const prefix = `${gift.id}-`

  function change(field: keyof PuzzleInput, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    setError('')
    const invalid = validatePuzzle(values)
    setErrors(invalid)
    const first = (Object.keys(invalid) as (keyof PuzzleInput)[]).find((field) => invalid[field])
    if (first) {
      document.getElementById(prefix + first)?.focus()
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      onSaved(await giftService.addPuzzle(gift.id, values))
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-3 pt-2">
      <p className="text-caption">This gift is from before searching. Add a riddle so students can find it.</p>
      <PuzzleFields prefix={prefix} value={values} errors={errors} readOnly={busy} onChange={change} />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={busy}>{busy ? 'Saving…' : 'Make it findable'}</Button>
    </form>
  )
}
