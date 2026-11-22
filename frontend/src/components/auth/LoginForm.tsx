import { ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { currentPasswordError, emailError } from '../../../../shared/authRules'
import { useAuth } from '../../context/authState'
import { useForm } from '../../hooks/useForm'
import { authService } from '../../services/authService'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Checkbox } from '../common/Checkbox'
import { PageHeading } from '../common/PageHeading'
import { EmailInput } from './EmailInput'
import { PasswordInput } from './PasswordInput'

export function LoginForm() {
  const { setUser } = useAuth()
  const { state } = useLocation()

  const form = useForm(
    { email: (state?.email as string) ?? '', password: '', remember: false },
    (values) => ({ email: emailError(values.email), password: currentPasswordError(values.password) }),
    async (values) => setUser(await authService.login({ ...values, email: values.email.trim() })),
  )

  return (
    <>
      <PageHeading title="Welcome back, explorer">Pick up the trail where you left off.</PageHeading>
      <form noValidate onSubmit={form.submit} aria-busy={form.busy} className="space-y-field">
        {state?.notice && !form.error && <Alert tone="success">{state.notice}</Alert>}
        {form.error && <Alert tone="error">{form.error}</Alert>}
        <EmailInput {...form.field('email')} autoComplete="username" />
        <PasswordInput {...form.field('password')} label="Password" autoComplete="current-password" required />
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <Checkbox
            id="remember"
            name="remember"
            label="Remember me"
            checked={form.values.remember}
            disabled={form.busy}
            onChange={(event) => form.set('remember', event.target.checked)}
          />
          <Link to="/forgot-password" state={{ email: form.values.email }} className="text-link py-3 text-caption">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={form.busy}>
          {form.busy ? 'Logging in…' : 'Log in'}
          {!form.busy && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </form>
    </>
  )
}
