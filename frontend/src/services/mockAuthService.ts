import { AuthError, type AuthService, type User } from '../types/auth'

// UI development only, and NOT secure. Everything lives in memory and resets on reload.
// Nothing is written to browser storage. Demo login: explorer@metu.edu.tr / campusquest
// New accounts verify with the code MOCK_CODE.

interface Account extends User {
  digest: string
}

export const MOCK_CODE = '123456'

const pause = () => new Promise((resolve) => setTimeout(resolve, 600))

async function digest(password: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createMockAuthService(): AuthService {
  const users = new Map<string, Account>()
  const resets = new Map<string, Account>()
  let current: User | null = null

  const seeded = digest('campusquest').then((hash) => {
    const email = 'explorer@metu.edu.tr'
    users.set(email, { id: 'demo', username: 'explorer', email, verified: true, digest: hash })
  })
  const publicUser = ({ id, username, email, verified }: Account): User => ({ id, username, email, verified })
  const invalidLink = () => new AuthError('INVALID_LINK', 'This mock link is invalid or was already used.')

  async function ready() {
    await Promise.all([pause(), seeded])
  }

  return {
    async getSession() {
      return current
    },

    async register(input) {
      await ready()
      const username = input.username.trim()
      const email = input.email.trim().toLowerCase()
      if ([...users.values()].some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        throw new AuthError('USERNAME_TAKEN', 'That username is already taken.', 'username')
      }
      if (users.has(email)) {
        throw new AuthError('EMAIL_TAKEN', 'This email already has an account. Log in or reset its password.', 'email')
      }
      const account = { id: crypto.randomUUID(), username, email, verified: false, digest: await digest(input.password) }
      users.set(email, account)
      current = publicUser(account)
      return current
    },

    async verifyEmail(code) {
      await ready()
      const account = current && users.get(current.email)
      if (!account) throw new AuthError('UNAUTHENTICATED', 'Please log in again.')
      if (code !== MOCK_CODE) throw new AuthError('WRONG_CODE', `Mock mode: the code is ${MOCK_CODE}.`, 'code')
      account.verified = true
      current = publicUser(account)
      return current
    },

    async resendVerification() {
      await ready()
      return { delivery: 'mock', devCode: MOCK_CODE }
    },

    async login(input) {
      await ready()
      const email = input.email.trim().toLowerCase()
      const account = users.get(email)
      if (!account || account.digest !== (await digest(input.password))) {
        throw new AuthError('INVALID_CREDENTIALS', 'That email and password don’t match. Check them and try again.')
      }
      current = publicUser(account)
      return current
    },

    async logout() {
      await ready()
      current = null
    },

    async forgotPassword(value) {
      await ready()
      const account = users.get(value.trim().toLowerCase())
      if (!account) return { delivery: 'mock' }
      const token = crypto.randomUUID()
      resets.set(token, account)
      return { delivery: 'mock', devLink: `/reset-password#token=${token}` }
    },

    async resetPassword(token, password) {
      await ready()
      const account = resets.get(token)
      if (!account) throw invalidLink()
      account.digest = await digest(password)
      account.verified = true
      resets.delete(token)
      current = null
    },
  }
}
