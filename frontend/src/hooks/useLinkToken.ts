import { useLocation } from 'react-router'

export function useLinkToken() {
  return new URLSearchParams(useLocation().hash.slice(1)).get('token') ?? ''
}
