import type { AuthService, User } from '../types/auth'
import { request } from './http'

export function createHttpAuthService(): AuthService {
  return {
    getSession: async () => (await request<{ user: User | null }>('auth/session')).user,
    register: async (input) => (await request<{ user: User }>('auth/register', input)).user,
    verifyEmail: async (code) => (await request<{ user: User }>('auth/verify-email', { code })).user,
    resendVerification: () => request('auth/resend-verification', {}),
    login: async (input) => (await request<{ user: User }>('auth/login', input)).user,
    logout: () => request('auth/logout', {}),
    forgotPassword: (email) => request('auth/forgot-password', { email }),
    resetPassword: (token, password) => request('auth/reset-password', { token, password }),
  }
}
