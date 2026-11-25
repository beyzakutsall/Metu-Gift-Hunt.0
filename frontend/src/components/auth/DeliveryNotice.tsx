import { Link } from 'react-router'
import type { DeliveryResult } from '../../types/auth'
import { Alert } from '../common/Alert'

// Development has no mail server, so say where the link really is.
export function DeliveryNotice({ delivery, devLink, devCode }: Partial<DeliveryResult>) {
  if (delivery === 'console') {
    return (
      <Alert tone="info">
        <strong>Development mode:</strong> no real email was sent. The message is printed in the terminal running the API.
      </Alert>
    )
  }
  if (delivery === 'mock') {
    return (
      <Alert tone="info">
        <strong>Mock mode:</strong> no real email was sent.{' '}
        {devCode && <>The code is <strong>{devCode}</strong>.</>}
        {devLink && (
          <Link to={devLink} className="text-link">
            Open the simulated link
          </Link>
        )}
      </Alert>
    )
  }
  return null
}
