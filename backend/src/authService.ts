import type pg from 'pg'
import { transaction } from './database.js'
import { AppError } from './errors.js'
import type { Mail, Mailer } from './mailer.js'
import type { RateLimiter } from './rateLimit.js'
import { createToken, hashPassword, hashToken, verifyPassword } from './security.js'

interface User {
  id: string
  username: string
  email: string
}

const DAY = 86_400_000
const invalidLink = () =>
  new AppError(400, 'INVALID_LINK', 'This link is invalid, expired or already used. Please request a new one.')
const TAKEN: Record<string, () => AppError> = {
  users_email_key: () =>
    new AppError(409, 'EMAIL_TAKEN', 'This email already has an account. Log in or reset its password.', { field: 'email' }),
  users_username_key: () =>
    new AppError(409, 'USERNAME_TAKEN', 'That username is already taken.', { field: 'username' }),
}

export function createAuthService(pool: pg.Pool, mailer: Mailer, limiter: RateLimiter, appUrl: string) {
  // Not awaited, so SMTP latency can't reveal which addresses have accounts.
  function send(mail: Mail) {
    mailer.send(mail).catch((error) => console.error('Email delivery failed:', error.message))
  }

  async function createSession(db: pg.Pool | pg.PoolClient, user: User, remember: boolean) {
    const token = createToken()
    const maxAge = (remember ? 30 : 1) * DAY
    await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      hashToken(token),
      user.id,
      new Date(Date.now() + maxAge),
    ])
    return { token, remember, maxAge, user: { id: user.id, username: user.username, email: user.email } }
  }

  return {
    // No email check: the account is usable at once, so an address doesn't prove who owns it.
    async register(username: string, email: string, password: string) {
      limiter.hit(`register:${email}`, 20, 60)
      const passwordHash = await hashPassword(password)
      try {
        return await transaction(pool, async (db) => {
          const { rows } = await db.query<User>(
            `INSERT INTO users (username, email, password_hash, terms_accepted_at)
             VALUES ($1, $2, $3, now()) RETURNING id, username, email`,
            [username, email, passwordHash],
          )
          return createSession(db, rows[0]!, false)
        })
      } catch (error) {
        // The constraints decide, so two simultaneous registrations can't both win.
        const { code, constraint } = error as { code?: string; constraint?: string }
        const taken = code === '23505' ? TAKEN[constraint ?? ''] : undefined
        throw taken ? taken() : error
      }
    },

    async login(email: string, password: string, remember: boolean, ip: string) {
      const key = `login:${ip}:${email}`
      limiter.hit(key, 10, 15)
      const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0]
      if (!(await verifyPassword(password, user?.password_hash))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'That email and password don’t match. Check them and try again.')
      }
      limiter.clear(key)
      return createSession(pool, user, remember)
    },

    async currentUser(token: string | undefined) {
      if (!token) return null
      const { rows } = await pool.query<User>(
        `SELECT u.id, u.username, u.email FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)],
      )
      return rows[0] ?? null
    },

    async logout(token: string | undefined) {
      if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    },

    async forgotPassword(email: string) {
      limiter.hit(`mail:${email}`, 5, 60)
      const user = (await pool.query<User>('SELECT id FROM users WHERE email = $1', [email])).rows[0]
      if (user) {
        const token = createToken()
        await pool.query(
          "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
          [hashToken(token), user.id],
        )
        send({
          to: email,
          subject: 'Reset your Campus Quest password',
          text: `Choose a new password within one hour:\n\n${appUrl}/reset-password#token=${token}\n\nIf you didn't ask for this, ignore this email.`,
        })
      }
      return { delivery: mailer.delivery }
    },

    async resetPassword(token: string, password: string) {
      const passwordHash = await hashPassword(password)
      await transaction(pool, async (db) => {
        const { rows } = await db.query<{ user_id: string }>(
          'DELETE FROM password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING user_id',
          [hashToken(token)],
        )
        const userId = rows[0]?.user_id
        if (!userId) throw invalidLink()
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
        await db.query('DELETE FROM password_resets WHERE user_id = $1', [userId])
        await db.query('DELETE FROM sessions WHERE user_id = $1', [userId])
      })
    },

    async deleteExpired() {
      await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
      await pool.query('DELETE FROM password_resets WHERE expires_at <= now()')
    },
  }
}
export type AuthService = ReturnType<typeof createAuthService>
