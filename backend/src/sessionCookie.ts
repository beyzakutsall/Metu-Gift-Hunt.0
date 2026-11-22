import type { CookieOptions, Request } from 'express'

export function createSessionCookie(secure: boolean) {
  const name = secure ? '__Host-cq_session' : 'cq_session'
  const options: CookieOptions = { httpOnly: true, sameSite: 'lax', secure, path: '/' }

  const read = (req: Request) =>
    req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1)

  return { name, options, read }
}
export type SessionCookie = ReturnType<typeof createSessionCookie>
