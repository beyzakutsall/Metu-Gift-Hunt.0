import { Search } from 'lucide-react'
import { useForm } from '../../hooks/useForm'
import { huntService } from '../../services/huntService'
import { AuthError } from '../../types/auth'
import type { Hunt } from '../../types/hunt'
import type { StudentProfile } from '../../types/student'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { ResetCountdown } from '../student/ResetCountdown'

interface Props {
  profile: StudentProfile
  available: boolean
  onStarted: (hunt: Hunt) => void
  onStale: () => void
}

export function StartHunt({ profile, available, onStarted, onStale }: Props) {
  const left = Math.max(0, profile.searches.limit - profile.searches.today)
  const form = useForm({}, () => ({}), async () => {
    try {
      onStarted(await huntService.start())
    } catch (error) {
      if (error instanceof AuthError && ['NO_GIFTS', 'DAILY_LIMIT', 'UNAUTHENTICATED'].includes(error.code)) onStale()
      throw error
    }
  })

  return (
    <div className="space-y-field">
      <ol className="list-decimal space-y-1.5 pl-5 text-caption">
        <li>You get a random main location, like a department building.</li>
        <li>Walk there. GPS unlocks a clue when you’re close.</li>
        <li>Follow the clue, solve the riddle and take a photo.</li>
        <li>Open the 3D gift. It unlocks in your booklet.</li>
      </ol>
      <p className="rounded-control bg-butter px-3 py-2 text-caption font-bold">
        {left} of {profile.searches.limit} searches left today
      </p>
      {form.error && <Alert tone="error">{form.error}</Alert>}
      {left === 0 ? (
        <ResetCountdown resetsAt={profile.resetsAt} />
      ) : available ? (
        <form onSubmit={form.submit} className="space-y-2">
          <Button type="submit" loading={form.busy}>
            {!form.busy && <Search className="size-5" aria-hidden />}
            {form.busy ? 'Choosing a gift…' : 'Find me a gift'}
          </Button>
          <p className="text-caption text-ink-soft">This uses one search. The gift is saved for you for 24 hours.</p>
        </form>
      ) : (
        <Alert tone="info">No gifts are waiting right now. You’ll be notified when someone hides one.</Alert>
      )}
    </div>
  )
}
