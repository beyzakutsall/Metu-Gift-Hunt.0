import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { DeliveryNotice } from '../components/auth/DeliveryNotice'
import { Alert } from '../components/common/Alert'
import { Button, ButtonLink } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import { loadPending, savePending, type Pending } from '../services/pendingRegistration'

export function EmailVerification() {
  const { state } = useLocation()
  const [pending, setPending] = useState<Pending | null>(() => state?.pending ?? loadPending())
  const [resent, setResent] = useState(false)

  const form = useForm({}, () => ({}), async () => {
    if (!pending) return
    setResent(false)
    const next = { ...pending, ...(await authService.resendVerification(pending.registrationId)) }
    savePending(next)
    setPending(next)
    setResent(true)
  })

  if (!pending) {
    return (
      <>
        <PageHeading title="Nothing to verify yet">Register first, or log in to pick up an unfinished registration.</PageHeading>
        <div className="space-y-3">
          <ButtonLink to="/register">Register</ButtonLink>
          <ButtonLink to="/login" variant="secondary">Log in</ButtonLink>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-5 grid size-16 -rotate-6 place-items-center rounded-control bg-sun">
        <MailCheck className="size-8" aria-hidden />
      </div>
      <PageHeading title="Check your METU inbox">
        A verification link has been sent to <strong className="break-words text-ink">{pending.email}</strong>.
      </PageHeading>
      <div className="space-y-field">
        {state?.unverified && !resent && <Alert tone="info">Verify your email before logging in. Lost the link? Resend it below.</Alert>}
        <p className="text-caption text-ink-soft">
          Open the link within 24 hours and confirm with the password you chose. Can’t find it? Look in your spam folder.
        </p>
        <DeliveryNotice delivery={pending.delivery} devLink={pending.devLink} />
        {resent && <Alert tone="success">A new link is on its way. Any earlier link no longer works.</Alert>}
        {form.error && <Alert tone="error">{form.error}</Alert>}
        <form onSubmit={form.submit}>
          <Button type="submit" variant="secondary" loading={form.busy}>
            {form.busy ? 'Resending…' : 'Resend link'}
          </Button>
        </form>
        <p className="flex flex-wrap justify-between gap-x-4 text-caption">
          <Link to="/register" className="text-link py-2">Use a different email</Link>
          <Link to="/login" className="text-link py-2">Back to log in</Link>
        </p>
      </div>
    </>
  )
}
