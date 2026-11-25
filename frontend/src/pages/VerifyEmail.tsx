import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { VERIFY_CODE_LENGTH, VERIFY_CODE_MINUTES, verifyCodeError } from '../../../shared/authRules'
import { DeliveryNotice } from '../components/auth/DeliveryNotice'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { PageHeading } from '../components/common/PageHeading'
import { useAuth } from '../context/authState'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import { AuthError, type DeliveryResult } from '../types/auth'

// Reached right after sign-up, and whenever an unverified student logs in.
export function VerifyEmail() {
  const { user, setUser } = useAuth()
  const [resent, setResent] = useState<DeliveryResult>()
  const [resendError, setResendError] = useState('')
  const [resending, setResending] = useState(false)

  const form = useForm(
    { code: '' },
    (values) => ({ code: verifyCodeError(values.code) }),
    async ({ code }) => setUser(await authService.verifyEmail(code.replace(/\s/g, ''))),
  )

  async function resend() {
    setResending(true)
    setResendError('')
    setResent(undefined)
    try {
      setResent(await authService.resendVerification())
    } catch (caught) {
      setResendError(caught instanceof AuthError ? caught.message : 'That didn’t work. Please try again.')
    } finally {
      setResending(false)
    }
  }

  async function logOut() {
    await authService.logout().catch(() => {})
    setUser(null)
  }

  return (
    <>
      <PageHeading title="Check your METU inbox">
        We sent a {VERIFY_CODE_LENGTH}-digit code to <strong>{user?.email}</strong>. It works for {VERIFY_CODE_MINUTES} minutes.
      </PageHeading>
      <form noValidate onSubmit={form.submit} aria-busy={form.busy} className="space-y-field">
        {form.error && <Alert tone="error">{form.error}</Alert>}
        {resendError && <Alert tone="error">{resendError}</Alert>}
        {resent && (
          <>
            <Alert tone="success">A new code is on its way. Earlier codes no longer work.</Alert>
            <DeliveryNotice {...resent} />
          </>
        )}
        {!resent && import.meta.env.MODE === 'mock' && <DeliveryNotice delivery="mock" devCode="123456" />}
        {!resent && import.meta.env.DEV && import.meta.env.MODE !== 'mock' && <DeliveryNotice delivery="console" />}
        <Input
          {...form.field('code')}
          label="Verification code"
          icon={KeyRound}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={VERIFY_CODE_LENGTH + 2}
          placeholder="123456"
          hint="Not there? Look in your spam or junk folder."
          required
        />
        <Button type="submit" loading={form.busy}>{form.busy ? 'Checking…' : 'Verify and start playing'}</Button>
        <Button variant="secondary" loading={resending} onClick={resend}>
          {resending ? 'Sending…' : 'Send a new code'}
        </Button>
        <button type="button" onClick={logOut} className="text-link inline-block py-2 text-caption">
          Wrong address? Log out
        </button>
      </form>
    </>
  )
}
