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

export function createMailer(): Mailer {
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
