import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { emailError } from '../../../shared/authRules'
import { DeliveryNotice } from '../components/auth/DeliveryNotice'
import { EmailInput } from '../components/auth/EmailInput'
import { Alert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'
import { useForm } from '../hooks/useForm'
import { authService } from '../services/authService'
import type { DeliveryResult } from '../types/auth'

export function ForgotPassword() {
  const { state } = useLocation()
  const [result, setResult] = useState<DeliveryResult>()

  const form = useForm(
    { email: (state?.email as string) ?? '' },
    (values) => ({ email: emailError(values.email) }),
    async ({ email }) => {
      setResult(undefined)
      setResult(await authService.forgotPassword(email.trim()))
    },
  )

  return (
    <>
      <PageHeading title="Lost the trail?">Enter your METU email to get a password reset link.</PageHeading>
      <form noValidate onSubmit={form.submit} className="space-y-field">
        {form.error && <Alert tone="error">{form.error}</Alert>}
        {result && (
          <>
            <Alert tone="success">If that email has an account, a reset link is on its way. It works for one hour.</Alert>
            <DeliveryNotice {...result} />
          </>
        )}
        <EmailInput {...form.field('email')} autoComplete="username" />
        <Button type="submit" loading={form.busy}>{form.busy ? 'Sending…' : 'Send reset link'}</Button>
        <Link to="/login" className="text-link inline-block py-2 text-caption">Back to log in</Link>
      </form>
    </>
  )
}
