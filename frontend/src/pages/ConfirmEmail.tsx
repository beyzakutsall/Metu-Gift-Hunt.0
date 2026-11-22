import { useNavigate } from 'react-router'
import { currentPasswordError } from '../../../shared/authRules'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Alert } from '../components/common/Alert'
import { Button, ButtonLink } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { useAuth } from '../context/authState'
import { useForm } from '../hooks/useForm'
import { useLinkToken } from '../hooks/useLinkToken'
import { authService } from '../services/authService'
import { clearPending } from '../services/pendingRegistration'

export function ConfirmEmail() {
  const token = useLinkToken()
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const form = useForm(
    { password: '' },
    (values) => ({ password: currentPasswordError(values.password) }),
    async ({ password }) => {
      setUser(await authService.verifyEmail(token, password))
      clearPending()
      navigate('/student', { replace: true })
    },
  )

  if (!token) {
    return (
      <>
        <PageHeading title="This link is incomplete">Open the full link from your email.</PageHeading>
        <ButtonLink to="/login">Back to log in</ButtonLink>
      </>
    )
  }

  return (
    <>
      <PageHeading title="Confirm it’s you">Enter the password you chose when registering to activate your account.</PageHeading>
      <form noValidate onSubmit={form.submit} className="space-y-field">
        {form.error && <Alert tone="error">{form.error}</Alert>}
        <PasswordInput {...form.field('password')} label="Password" autoComplete="current-password" required />
        <Button type="submit" loading={form.busy}>{form.busy ? 'Verifying…' : 'Verify email'}</Button>
        <p className="text-caption text-ink-soft">Didn’t register? Close this page and no account will be created.</p>
      </form>
    </>
  )
}
