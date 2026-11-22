// Single source of truth for validation, used by both the browser and the API.

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

// Exact domain only. Deliberately no "u" flag: with it, lookalikes such as the Kelvin sign match "k".
// "+" aliases are rejected so one inbox cannot open many accounts.
const METU_EMAIL = /^[a-z0-9]+(?:[._-][a-z0-9]+)*@metu\.edu\.tr$/i
const USERNAME = /^[a-z0-9_]{3,20}$/i

export function emailError(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Enter your METU email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a complete email, like e123456@metu.edu.tr.'
  if (!email.toLowerCase().endsWith('@metu.edu.tr')) return 'Use an address ending in @metu.edu.tr.'
  if (email.length > 100 || !METU_EMAIL.test(email)) return 'That doesn’t look like a valid METU address.'
}

export function usernameError(value: string): string | undefined {
  const username = value.trim()
  if (!username) return 'Choose a username.'
  if (username.length < 3 || username.length > 20) return 'Use between 3 and 20 characters.'
  if (!USERNAME.test(username)) return 'Use only English letters, numbers and underscores.'
}

export function newPasswordError(value: string): string | undefined {
  if (!value) return 'Create a password.'
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (value.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`
  if (!value.trim()) return 'A password can’t be only spaces.'
}

export function currentPasswordError(value: string): string | undefined {
  if (!value) return 'Enter your password.'
  if (value.length > PASSWORD_MAX) return 'That password is too long.'
}
