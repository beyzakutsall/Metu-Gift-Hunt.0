import { ArrowRight, AtSign } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { PASSWORD_MIN, emailError, newPasswordError, usernameError } from '../../../../shared/authRules'
import { useForm } from '../../hooks/useForm'
import { authService } from '../../services/authService'
import { savePending } from '../../services/pendingRegistration'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Checkbox } from '../common/Checkbox'
import { Input } from '../common/Input'
import { PageHeading } from '../common/PageHeading'
import { EmailInput } from './EmailInput'
import { PasswordInput } from './PasswordInput'

export function RegisterForm() {
  const navigate = useNavigate()

  const form = useForm(
    { username: '', email: '', password: '', confirm: '', acceptTerms: false },
    (values) => ({
      username: usernameError(values.username),
      email: emailError(values.email),
      password: newPasswordError(values.password),
      confirm: !values.confirm
        ? 'Enter your password again.'
        : values.confirm !== values.password
          ? 'Passwords don’t match.'
          : undefined,
      acceptTerms: values.acceptTerms ? undefined : 'Accept the Terms of Service to continue.',
    }),
    async ({ confirm: _confirm, ...values }) => {
      const pending = await authService.register({ ...values, username: values.username.trim(), email: values.email.trim() })
      savePending(pending)
      navigate('/verify-email', { state: { pending } })
    },
  )

  return (
    <>
      <PageHeading title="Start your adventure">All you need is your METU email.</PageHeading>
      <form noValidate onSubmit={form.submit} aria-busy={form.busy} className="space-y-field">
        {form.error && <Alert tone="error">{form.error}</Alert>}
        <Input
          {...form.field('username')}
          label="Username"
          icon={AtSign}
          autoComplete="nickname"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="pine_wanderer"
          required
        />
        <EmailInput {...form.field('email')} autoComplete="username" />
        <PasswordInput
          {...form.field('password')}
          label="Password"
          hint={`At least ${PASSWORD_MIN} characters.`}
          autoComplete="new-password"
          required
        />
        <PasswordInput {...form.field('confirm')} label="Confirm password" autoComplete="new-password" required />
        <Checkbox
          id="acceptTerms"
          name="acceptTerms"
          required
          checked={form.values.acceptTerms}
          disabled={form.busy}
          error={form.errorFor('acceptTerms')}
          onChange={(event) => form.set('acceptTerms', event.target.checked)}
          label={
            <>
              I accept the{' '}
              <Link to="/terms" target="_blank" className="text-link">
                Terms of Service<span className="sr-only"> (opens in a new tab)</span>
              </Link>
            </>
          }
        />
        <Button type="submit" loading={form.busy}>
          {form.busy ? 'Creating account…' : 'Register'}
          {!form.busy && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </form>
    </>
  )
}
