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

/** The UI depends only on this contract. */
export interface AuthService {
  getSession(): Promise<User | null>
  /** Creates the account and signs in. */
  register(input: RegisterInput): Promise<User>
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
  ) {
    super(message)
  }
}
