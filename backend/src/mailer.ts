import nodemailer from 'nodemailer'
import { config } from './config.js'

export interface Mail {
  to: string
  subject: string
  text: string
}

export interface Mailer {
  delivery: 'email' | 'console'
  send(mail: Mail): Promise<void>
}

/** "Name <address>" or a bare address, as in MAIL_FROM. */
export function parseSender(from: string) {
  const match = /^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(from)
  if (match) return { name: match[1]!.replace(/^"|"$/g, '') || undefined, email: match[2]! }
  return { email: from.trim() }
}

// Render's free plan blocks SMTP ports, so Brevo is reached over HTTPS instead.
function brevoMailer(apiKey: string): Mailer {
  const sender = parseSender(config.mailFrom)
  return {
    delivery: 'email',
    async send({ to, subject, text }) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) {
        // Brevo's error code only: the body could echo the recipient.
        const code = await response.json().then((body) => body?.code, () => undefined)
        throw new Error(`Brevo answered ${response.status}${code ? ` (${code})` : ''}`)
      }
    },
  }
}

export function createMailer(): Mailer {
  if (config.brevoApiKey) return brevoMailer(config.brevoApiKey)
  if (config.smtpUrl) {
    const transport = nodemailer.createTransport(config.smtpUrl)
    return {
      delivery: 'email',
      send: async (mail) => void (await transport.sendMail({ from: config.mailFrom, ...mail })),
    }
  }
  return {
    delivery: 'console',
    send: async ({ to, subject, text }) =>
      console.log(`\n===== DEV EMAIL (not sent) =====\nTo: ${to}\nSubject: ${subject}\n\n${text}\n================================\n`),
  }
}
