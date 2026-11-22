import { useState } from 'react'
import { useForm } from '../../hooks/useForm'
import { huntService } from '../../services/huntService'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

export function GiveUp({ huntId, onDone }: { huntId: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const form = useForm({}, () => ({}), async () => {
    await huntService.giveUp(huntId)
    onDone()
  })

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-link min-h-11 min-w-11 text-caption">
        Give up this hunt
      </button>
    )
  }
  return (
    <form onSubmit={form.submit} className="space-y-2 rounded-control bg-paper p-3">
      <p className="text-caption font-bold">Give up? The search stays used and you won’t get this gift again.</p>
      {form.error && <Alert tone="error">{form.error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)}>Keep going</Button>
        <Button type="submit" loading={form.busy}>Give up</Button>
      </div>
    </form>
  )
}
