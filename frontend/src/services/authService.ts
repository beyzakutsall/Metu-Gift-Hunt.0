import type { AuthService } from '../types/auth'
import { createHttpAuthService } from './httpAuthService'
import { createMockAuthService } from './mockAuthService'

// The only place that picks an implementation. Mock mode needs `npm run dev:mock`;
// normal builds drop the mock code entirely.
export const authService: AuthService =
  import.meta.env.MODE === 'mock' ? createMockAuthService() : createHttpAuthService()
