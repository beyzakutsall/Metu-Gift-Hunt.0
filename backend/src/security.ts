import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// An OWASP-recommended scrypt profile: 64 MiB, parallelism 2.
const N = 2 ** 16
const r = 8
const p = 2

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFC'), salt, 32, { N, r, p, maxmem: 128 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  )
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('base64')}$${(await derive(password, salt)).toString('base64')}`
}

// A missing hash still costs one derivation, so response time doesn't reveal whether an account exists.
export async function verifyPassword(password: string, stored: string | undefined) {
  const [, salt, key] = stored?.split('$') ?? []
  const actual = await derive(password, salt ? Buffer.from(salt, 'base64') : randomBytes(16))
  return key !== undefined && timingSafeEqual(actual, Buffer.from(key, 'base64'))
}

export const createToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
