export interface User {
  id: string
  username: string
  email: string
}

export interface LoginInput {
  email: string
  password: string
  remember: boolean
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  acceptTerms: boolean
}

/** Where the email went. `devLink` is only ever set by the mock service. */
export interface DeliveryResult {
  delivery: 'email' | 'console' | 'mock'
  devLink?: string
}

export interface Registration extends DeliveryResult {
  registrationId: string
  email: string
}

/** The UI depends only on this contract. */
export interface AuthService {
  getSession(): Promise<User | null>
  register(input: RegisterInput): Promise<Registration>
  resendVerification(registrationId: string): Promise<DeliveryResult>
  verifyEmail(token: string, password: string): Promise<User>
  login(input: LoginInput): Promise<User>
  logout(): Promise<void>
  forgotPassword(email: string): Promise<DeliveryResult>
  resetPassword(token: string, password: string): Promise<void>
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string,
    readonly registrationId?: string,
  ) {
    super(message)
  }
}
