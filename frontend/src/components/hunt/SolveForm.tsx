import { useRef, useState, type FormEvent } from 'react'
import { ANSWER_MAX, guessError } from '../../../../shared/giftRules'
import { FIX_MAX_AGE_MS } from '../../../../shared/huntRules'
import type { TimedFix } from '../../hooks/useGeolocation'
import { huntService } from '../../services/huntService'
import { AuthError } from '../../types/auth'
import type { Hunt, Reward } from '../../types/hunt'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

interface Props {
  hunt: Hunt
  fix: TimedFix | null
  onSolved: (reward: Reward) => void
  onChanged: () => void
  onEnded: (message: string) => void
}

export function SolveForm({ hunt, fix, onSolved, onChanged, onEnded }: Props) {
  const [answer, setAnswer] = useState('')
  const [errors, setErrors] = useState<{ answer?: string }>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    setError('')
    const invalid = { answer: guessError(answer) }
    setErrors(invalid)
    if (invalid.answer) {
      document.getElementById('guess')?.focus()
      return
    }
    if (!fix || Date.now() - fix.time > FIX_MAX_AGE_MS) {
      setError('We need your current location. Turn it on above and wait for a reading.')
      return
    }

    inFlight.current = true
    setBusy(true)
    try {
      const { latitude, longitude, accuracy } = fix
      onSolved(await huntService.solve(hunt.id, { latitude, longitude, accuracy, answer }))
    } catch (caught) {
      if (!(caught instanceof AuthError)) setError('Something went wrong. Please try again.')
      else if (['HUNT_FAILED', 'HUNT_ENDED', 'NOT_FOUND', 'UNAUTHENTICATED'].includes(caught.code)) onEnded(caught.message)
      else {
        if (caught.field === 'answer') setErrors({ answer: caught.message })
        else setError(caught.message)
        if (caught.code === 'WRONG_ANSWER') onChanged()
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={busy} className="space-y-field">
      <Input
        id="guess"
        label="Your answer"
        value={answer}
        error={errors.answer}
        hint={`${hunt.attemptsLeft} ${hunt.attemptsLeft === 1 ? 'try' : 'tries'} left`}
        maxLength={ANSWER_MAX}
        readOnly={busy}
        required
        autoComplete="off"
        onChange={(event) => {
          setAnswer(event.target.value)
          setErrors((previous) => ({ ...previous, answer: undefined }))
        }}
      />
      <div aria-live="assertive">{error && <Alert tone="error">{error}</Alert>}</div>
      <Button type="submit" loading={busy}>{busy ? 'Checking…' : 'Answer the riddle'}</Button>
    </form>
  )
}
