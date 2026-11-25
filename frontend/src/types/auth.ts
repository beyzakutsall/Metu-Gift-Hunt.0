export interface User {
  id: string
  username: string
  email: string
  /** Entered the code emailed to their METU address. Only verified students can play. */
  verified: boolean
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
  devCode?: string
}

/** The UI depends only on this contract. */
export interface AuthService {
  getSession(): Promise<User | null>
  /** Creates the account, signs in, and emails a verification code. */
  register(input: RegisterInput): Promise<User>
  verifyEmail(code: string): Promise<User>
  resendVerification(): Promise<DeliveryResult>
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
