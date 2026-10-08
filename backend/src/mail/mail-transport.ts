import { Logger } from '@nestjs/common'
import { readFileSync } from 'node:fs'
import { resolveMx } from 'node:dns/promises'
import { createTransport, type SendMailOptions } from 'nodemailer'
import type { configuration } from '../config/configuration'
import type { RenderedMail } from './mail-templates'

type MailConfig = ReturnType<typeof configuration>['mail']

export interface OutgoingMail extends RenderedMail { to: string }

export interface MailTransport { send(mail: OutgoingMail): Promise<void> }

/** `permanent` = the receiving side rejected the message (5xx); retrying cannot help. */
export class MailSendError extends Error {
  constructor(message: string, readonly permanent: boolean) { super(message) }
}

/** What the `log` transport "sent", newest last — read by tests and by `npm run mail -- test` in dev. */
export const loggedMails: OutgoingMail[] = []

function dkimOptions(config: MailConfig) {
  const { domain, selector, privateKey, keyFile } = config.dkim
  if (!selector || (!privateKey && !keyFile)) return undefined
  return { domainName: domain, keySelector: selector, privateKey: privateKey || readFileSync(keyFile, 'utf8') }
}

function message(config: MailConfig, mail: OutgoingMail): SendMailOptions {
  return {
    from: { name: config.fromName, address: config.from }, to: mail.to,
    subject: mail.subject, text: mail.text, html: mail.html,
    headers: { 'Auto-Submitted': 'auto-generated' },
  }
}

function rejection(error: unknown) {
  const code = (error as { responseCode?: number }).responseCode
  return new MailSendError(error instanceof Error ? error.message : String(error), typeof code === 'number' && code >= 500)
}

class LogTransport implements MailTransport {
  private readonly logger = new Logger('Mail')
  async send(mail: OutgoingMail) {
    loggedMails.push(mail)
    if (loggedMails.length > 50) loggedMails.shift()
    this.logger.log(`[log transport] to=${mail.to} subject="${mail.subject}"\n${mail.text}`)
  }
}

function smtpTransporter(config: MailConfig, timeouts: { connectionTimeout?: number; greetingTimeout?: number; socketTimeout?: number } = {}) {
  const { host, port, secure, user, pass } = config.smtp
  return createTransport({ host, port, secure, name: config.heloName, auth: user ? { user, pass } : undefined, dkim: dkimOptions(config), ...timeouts })
}

class SmtpTransport implements MailTransport {
  private readonly transporter
  constructor(private readonly config: MailConfig) { this.transporter = smtpTransporter(config) }
  async send(mail: OutgoingMail) {
    try { await this.transporter.sendMail(message(this.config, mail)) }
    catch (error) { throw rejection(error) }
  }
}

/** Connects and logs in without sending anything; the error text comes from the SMTP server. */
export async function verifySmtp(config: MailConfig) {
  // Short timeouts: an admin is waiting on the button, unlike the queue.
  const transporter = smtpTransporter(config, { connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 })
  try {
    await transporter.verify()
    return { ok: true as const, error: null }
  } catch (error) {
    return { ok: false as const, error: (error instanceof Error ? error.message : String(error)).slice(0, 300) }
  } finally { transporter.close() }
}

/** Delivers straight to the recipient's MX on port 25, like a minimal MTA. */
class DirectTransport implements MailTransport {
  private readonly dkim
  constructor(private readonly config: MailConfig) { this.dkim = dkimOptions(config) }

  private async exchanges(domain: string) {
    try {
      const records = await resolveMx(domain)
      // A single "." exchange is a null MX (RFC 7505): the domain accepts no mail.
      if (records.length === 1 && records[0].exchange === '') throw new MailSendError(`${domain} does not accept mail`, true)
      return records.sort((a, b) => a.priority - b.priority).map((record) => record.exchange)
    } catch (error) {
      if (error instanceof MailSendError) throw error
      const code = (error as { code?: string }).code
      // RFC 5321 §5.1: without MX records, the domain's own address is the implicit MX.
      if (code === 'ENODATA') return [domain]
      if (code === 'ENOTFOUND') throw new MailSendError(`${domain} does not exist`, true)
      throw new MailSendError(`MX lookup failed for ${domain}: ${code ?? String(error)}`, false)
    }
  }

  async send(mail: OutgoingMail) {
    const domain = mail.to.split('@')[1]
    let last: MailSendError | null = null
    for (const host of await this.exchanges(domain)) {
      // STARTTLS certificates stay verified: a mismatching MX fails over to the next one instead of being trusted.
      const transporter = createTransport({ host, port: 25, secure: false, name: this.config.heloName, dkim: this.dkim,
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000, tls: { servername: host } })
      try {
        await transporter.sendMail(message(this.config, mail))
        return
      } catch (error) {
        last = rejection(error)
        if (last.permanent) throw last
      } finally { transporter.close() }
    }
    throw last ?? new MailSendError(`No mail exchanger reachable for ${domain}`, false)
  }
}

export function createMailTransport(config: MailConfig): MailTransport {
  if (config.transport === 'smtp') return new SmtpTransport(config)
  if (config.transport === 'direct') return new DirectTransport(config)
  return new LogTransport()
}
