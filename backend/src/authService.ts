import { randomInt, timingSafeEqual } from 'node:crypto'
import type pg from 'pg'
import { VERIFY_CODE_LENGTH, VERIFY_CODE_MINUTES, VERIFY_MAX_ATTEMPTS } from '../../shared/authRules.js'
import { transaction } from './database.js'
import { AppError } from './errors.js'
import type { Mail, Mailer } from './mailer.js'
import type { RateLimiter } from './rateLimit.js'
import { createToken, hashPassword, hashToken, verifyPassword } from './security.js'

interface User {
  id: string
  username: string
  email: string
  verified: boolean
}

const USER_COLUMNS = 'u.id, u.username, u.email, u.email_verified_at IS NOT NULL AS verified'

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
    return {
      token, remember, maxAge,
      user: { id: user.id, username: user.username, email: user.email, verified: user.verified },
    }
  }

  // The code is tied to the student, so a leaked hash can't be replayed against another account.
  const codeHash = (userId: string, code: string) => hashToken(`${userId}:${code}`)

  async function sendVerification(user: User) {
    limiter.hit(`verify-mail:${user.id}`, 5, 60)
    const code = String(randomInt(0, 10 ** VERIFY_CODE_LENGTH)).padStart(VERIFY_CODE_LENGTH, '0')
    await pool.query(
      `INSERT INTO email_verifications (user_id, code_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))
       ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at`,
      [user.id, codeHash(user.id, code), VERIFY_CODE_MINUTES],
    )
    send({
      to: user.email,
      subject: `${code} is your METU Gift Hunt code`,
      text: `Your METU Gift Hunt verification code is:\n\n${code}\n\nIt works for ${VERIFY_CODE_MINUTES} minutes. If you didn't sign up, ignore this email: the account is deleted after a day.`,
    })
  }

  return {
    // The account can sign in at once, but can't play until the emailed code is entered.
    // Someone who registers another student's address gets nowhere: the owner can take the
    // account back with a password reset, and unverified accounts are deleted after a day.
    async register(username: string, email: string, password: string) {
      limiter.hit(`register:${email}`, 20, 60)
      const passwordHash = await hashPassword(password)
      try {
        return await transaction(pool, async (db) => {
          const { rows } = await db.query<User>(
            `INSERT INTO users (username, email, password_hash, terms_accepted_at)
             VALUES ($1, $2, $3, now()) RETURNING id, username, email, false AS verified`,
            [username, email, passwordHash],
          )
          return createSession(db, rows[0]!, false)
        }).then(async (session) => {
          await sendVerification(session.user)
          return session
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
      // Also per account, so changing IP doesn't buy unlimited guesses at one password.
      limiter.hit(`login-email:${email}`, 30, 60)
      const user = (await pool.query(`SELECT ${USER_COLUMNS}, u.password_hash FROM users u WHERE u.email = $1`, [email])).rows[0]
      if (!(await verifyPassword(password, user?.password_hash))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'That email and password don’t match. Check them and try again.')
      }
      limiter.clear(key)
      return createSession(pool, user, remember)
    },

    async currentUser(token: string | undefined) {
      if (!token) return null
      const { rows } = await pool.query<User>(
        `SELECT ${USER_COLUMNS} FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)],
      )
      return rows[0] ?? null
    },

    async logout(token: string | undefined) {
      if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    },

    async resendVerification(user: User) {
      if (user.verified) return { delivery: mailer.delivery }
      await sendVerification(user)
      return { delivery: mailer.delivery }
    },

    async verifyEmail(user: User, code: string) {
      if (user.verified) return { ...user, verified: true }
      const expired = () =>
        new AppError(400, 'CODE_EXPIRED', 'This code has expired or was used up. Send yourself a new one.', { field: 'code' })

      const outcome = await transaction(pool, async (db) => {
        const { rows } = await db.query<{ code_hash: string; attempts: number; live: boolean }>(
          `SELECT code_hash, attempts, expires_at > now() AS live FROM email_verifications
           WHERE user_id = $1 FOR UPDATE`,
          [user.id],
        )
        const row = rows[0]
        if (!row || !row.live || row.attempts >= VERIFY_MAX_ATTEMPTS) return 'expired'
        const right = timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(codeHash(user.id, code)))
        if (!right) {
          await db.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = $1', [user.id])
          return VERIFY_MAX_ATTEMPTS - row.attempts - 1
        }
        await db.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [user.id])
        await db.query('DELETE FROM email_verifications WHERE user_id = $1', [user.id])
        return 'verified'
      })

      if (outcome === 'verified') return { ...user, verified: true }
      if (outcome === 'expired' || outcome <= 0) throw expired()
      throw new AppError(400, 'WRONG_CODE', `That code isn’t right. ${outcome} ${outcome === 1 ? 'try' : 'tries'} left.`, {
        field: 'code',
      })
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
          subject: 'Reset your METU Gift Hunt password',
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
        // The link reached the inbox, which proves ownership as well as the emailed code does.
        await db.query(
          'UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $2',
          [passwordHash, userId],
        )
        await db.query('DELETE FROM password_resets WHERE user_id = $1', [userId])
        await db.query('DELETE FROM sessions WHERE user_id = $1', [userId])
      })
    },

    async deleteExpired() {
      await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
      await pool.query('DELETE FROM password_resets WHERE expires_at <= now()')
      // Frees addresses and usernames that someone registered but never proved.
      await pool.query("DELETE FROM users WHERE email_verified_at IS NULL AND created_at < now() - interval '1 day'")
    },
  }
}
export type AuthService = ReturnType<typeof createAuthService>
