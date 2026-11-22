import { AuthError } from '../types/auth'

export async function request<T>(path: string, body?: object, timeoutMs = 15_000): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new AuthError('NETWORK', 'We can’t reach Campus Quest. Check your connection and try again.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = data?.error
    throw new AuthError(
      error?.code ?? 'UNAVAILABLE',
      error?.message ?? 'Campus Quest is unavailable right now. Please try again shortly.',
      error?.field,
    )
  }
  return data as T
}
