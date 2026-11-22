import { useNavigate } from 'react-router'
import { PASSWORD_MIN, newPasswordError } from '../../../shared/authRules'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Alert } from '../components/common/Alert'
import { Button, ButtonLink } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { useAuth } from '../context/AuthContext'
import { useForm } from '../hooks/useForm'
import { useLinkToken } from '../hooks/useLinkToken'
import { authService } from '../services/authService'

export function ResetPassword() {
  const token = useLinkToken()
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const form = useForm(
    { password: '', confirm: '' },
    (values) => ({
      password: newPasswordError(values.password),
      confirm: values.confirm && values.confirm === values.password ? undefined : 'Enter the same password again.',
    }),
    async ({ password }) => {
      await authService.resetPassword(token, password)
      setUser(null)
      navigate('/login', { replace: true, state: { notice: 'Password updated. Log in with your new password.' } })
    },
  )

  if (!token) {
    return (
      <>
        <PageHeading title="This link is incomplete">Request a new password reset link.</PageHeading>
        <ButtonLink to="/forgot-password">Get a new link</ButtonLink>
      </>
    )
  }

  return (
    <>
      <PageHeading title="Choose a new password">This logs you out on every device.</PageHeading>
      <form noValidate onSubmit={form.submit} className="space-y-field">
        {form.error && <Alert tone="error">{form.error}</Alert>}
        <PasswordInput
          {...form.field('password')}
          label="New password"
          hint={`At least ${PASSWORD_MIN} characters.`}
          autoComplete="new-password"
          required
        />
        <PasswordInput {...form.field('confirm')} label="Confirm new password" autoComplete="new-password" required />
        <Button type="submit" loading={form.busy}>{form.busy ? 'Updating…' : 'Update password'}</Button>
      </form>
    </>
  )
}
