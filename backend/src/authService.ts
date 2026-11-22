import { randomUUID } from 'node:crypto'
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
const usernameTaken = () =>
  new AppError(409, 'USERNAME_TAKEN', 'That username is already taken.', { field: 'username' })

export function createAuthService(pool: pg.Pool, mailer: Mailer, limiter: RateLimiter, appUrl: string) {
  // Not awaited, so SMTP latency can't reveal which addresses have accounts.
  function send(mail: Mail) {
    mailer.send(mail).catch((error) => console.error('Email delivery failed:', error.message))
  }

  function sendVerification(to: string, username: string, token: string) {
    send({
      to,
      subject: 'Verify your Campus Quest account',
      // Tokens go in the fragment, which browsers never send to servers or their logs.
      text: `Confirm the account "${username}" within 24 hours:\n\n${appUrl}/verify-email/confirm#token=${token}\n\nYou'll need the password chosen at registration. If you didn't register, ignore this email.`,
    })
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
    async register(username: string, email: string, password: string) {
      limiter.hit(`mail:${email}`, 5, 60)
      // Hash first so new and existing addresses take the same time.
      const passwordHash = await hashPassword(password)
      const result = { email, delivery: mailer.delivery }

      if ((await pool.query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [username])).rowCount) {
        throw usernameTaken()
      }
      if ((await pool.query('SELECT 1 FROM users WHERE email = $1', [email])).rowCount) {
        send({
          to: email,
          subject: 'You already have a Campus Quest account',
          text: `Someone tried to register with this email, but you already have an account.\n\nLog in: ${appUrl}/login\nReset your password: ${appUrl}/forgot-password`,
        })
        return { ...result, registrationId: randomUUID() }
      }

      const token = createToken()
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO pending_registrations (username, email, password_hash, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '24 hours') RETURNING id`,
        [username, email, passwordHash, hashToken(token)],
      )
      sendVerification(email, username, token)
      return { ...result, registrationId: rows[0]!.id }
    },

    async resendVerification(id: string) {
      limiter.hit(`resend:${id}`, 3, 60)
      const { rows } = await pool.query<User>('SELECT id, username, email FROM pending_registrations WHERE id = $1', [id])
      const pending = rows[0]
      if (pending) {
        const token = createToken()
        await pool.query(
          "UPDATE pending_registrations SET token_hash = $1, expires_at = now() + interval '24 hours' WHERE id = $2",
          [hashToken(token), id],
        )
        sendVerification(pending.email, pending.username, token)
      }
      return { delivery: mailer.delivery }
    },

    // Needs the token and the password. Otherwise someone could register with a student's email and
    // their own password, then wait for the student to click the link.
    async verifyEmail(token: string, password: string) {
      const tokenHash = hashToken(token)
      limiter.hit(`verify:${tokenHash}`, 10, 15)
      const { rows } = await pool.query(
        'SELECT * FROM pending_registrations WHERE token_hash = $1 AND expires_at > now()',
        [tokenHash],
      )
      const pending = rows[0]
      if (!pending) throw invalidLink()
      if (!(await verifyPassword(password, pending.password_hash))) {
        throw new AppError(400, 'WRONG_PASSWORD', 'That isn’t the password chosen for this registration.', { field: 'password' })
      }

      try {
        return await transaction(pool, async (db) => {
          const claimed = await db.query('DELETE FROM pending_registrations WHERE id = $1 AND token_hash = $2', [pending.id, tokenHash])
          if (!claimed.rowCount) throw invalidLink()
          const created = await db.query<User>(
            `INSERT INTO users (username, email, password_hash, terms_accepted_at)
             VALUES ($1, $2, $3, $4) RETURNING id, username, email`,
            [pending.username, pending.email, pending.password_hash, pending.terms_accepted_at],
          )
          await db.query('DELETE FROM pending_registrations WHERE email = $1', [pending.email])
          return createSession(db, created.rows[0]!, false)
        })
      } catch (error) {
        const { code, constraint } = error as { code?: string; constraint?: string }
        if (code !== '23505') throw error
        if (constraint === 'users_username_key') {
          throw new AppError(409, 'USERNAME_TAKEN', 'Someone claimed that username first. Please register again with another one.')
        }
        throw invalidLink()
      }
    },

    async login(email: string, password: string, remember: boolean, ip: string) {
      const key = `login:${ip}:${email}`
      limiter.hit(key, 10, 15)
      const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0]
      const pending = user
        ? undefined
        : (await pool.query(
            'SELECT id, password_hash FROM pending_registrations WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
            [email],
          )).rows[0]

      if (!(await verifyPassword(password, (user ?? pending)?.password_hash))) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'That email and password don’t match. Check them and try again.')
      }
      limiter.clear(key)
      if (pending) {
        throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before logging in.', { registrationId: pending.id })
      }
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
      // A week's grace, so an expired link can still be resent.
      await pool.query("DELETE FROM pending_registrations WHERE expires_at <= now() - interval '7 days'")
    },
  }
}
export type AuthService = ReturnType<typeof createAuthService>
