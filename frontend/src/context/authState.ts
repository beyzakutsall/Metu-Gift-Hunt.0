import { createContext, use } from 'react'
import type { User } from '../types/auth'

export interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
}

// Kept apart from the provider and importing only types, so hot reload can't create a second
// context that the mounted provider doesn't know about.
export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const state = use(AuthContext)
  if (!state) throw new Error('useAuth must be used inside AuthProvider')
  return state
}
