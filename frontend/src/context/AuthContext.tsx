import { useEffect, useState, type ReactNode } from 'react'
import { authService } from '../services/authService'
import type { User } from '../types/auth'
import { AuthContext } from './authState'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authService
      .getSession()
      .then((session) => active && setUser(session))
      // API down: show the forms, which report the problem on submit.
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return <AuthContext value={{ user, loading, setUser }}>{children}</AuthContext>
}
