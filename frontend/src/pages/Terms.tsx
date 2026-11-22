import { Alert } from '../components/common/Alert'
import { ButtonLink } from '../components/common/Button'
import { PageHeading } from '../components/common/PageHeading'

export function Terms() {
  return (
    <>
      <PageHeading title="Terms of Service" />
      <div className="space-y-field">
        <Alert tone="info">Placeholder draft. It must be replaced with reviewed terms, including a KVKK privacy notice, before launch.</Alert>
        <ul className="list-disc space-y-2 pl-5 text-caption text-ink-soft">
          <li>Campus Quest is a student project and is not an official METU service.</li>
          <li>Register with your own METU email and keep your password private.</li>
          <li>We store your username, email, a password hash and the time you accepted these terms.</li>
          <li>Respect other students, campus property and restricted areas.</li>
        </ul>
        <ButtonLink to="/register" variant="secondary">Back to registration</ButtonLink>
      </div>
    </>
  )
}
