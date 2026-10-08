import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { randomInt } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import { AccountsService } from '../accounts/accounts.service'
import { EmailChangesRepository } from '../accounts/email-changes.repository'
import { maskEmail } from '../accounts/mask-email'
import { configuration } from '../config/configuration'
import { MailService } from '../mail/mail.service'
import type { MailLocale } from '../mail/mail-templates'
import type { SessionUser } from '../session/session.repository'
import { SessionService } from '../session/session.service'
import { AuthFloodRepository } from './auth-flood.repository'
import { authHash, emailCodeKey } from './auth-hash'
import { AuthService } from './auth.service'
import { enforceLimit } from './rate-limit'

const REQUESTS_PER_USER = { limit: 3, window: 900 }
const REQUESTS_PER_IP = { limit: 10, window: 3600 }
const VERIFICATIONS_PER_IP = { limit: 30, window: 3600 }

export const EMAIL_SAME = { ok: false, code: 'EMAIL_SAME', message: 'Đây đã là email của tài khoản.' }
export const EMAIL_TAKEN = { ok: false, code: 'EMAIL_TAKEN', message: 'Email này đã thuộc một tài khoản khác.' }

const now = () => Math.floor(Date.now() / 1000)
const codeHash = (userId: string, code: string) => authHash(`email-change:${userId}:${code}`)

@Injectable()
export class EmailChangeService {
  constructor(
    private readonly auth: AuthService,
    private readonly flood: AuthFloodRepository,
    private readonly changes: EmailChangesRepository,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * Step one of a self-service change: the code goes to the NEW address, which proves the person owns it.
   * Whether that address already has an account is told only after the code, so this cannot probe emails.
   */
  async request(user: SessionUser, newEmail: string, password: unknown, locale: MailLocale, ip: string) {
    if (newEmail === user.email) throw new BadRequestException(EMAIL_SAME)
    const at = now()
    await enforceLimit(this.flood, `email-change-ip:${ip}`, REQUESTS_PER_IP, at)
    await this.auth.confirmPassword(user.id, password)
    await enforceLimit(this.flood, `email-change:${user.id}`, REQUESTS_PER_USER, at)
    const { otpTtlSeconds } = configuration().auth
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await this.changes.start(user.id, newEmail, codeHash(user.id, code), at + otpTtlSeconds, at)
    await this.mail.enqueue(newEmail, 'email_change_code', { code, locale, ttlMinutes: Math.round(otpTtlSeconds / 60) }, at + otpTtlSeconds)
    return { ok: true }
  }

  /** Like a password change, it signs out every other device: a new email often means the old one is at risk. */
  async confirm(request: FastifyRequest, user: SessionUser, code: string) {
    const at = now()
    await enforceLimit(this.flood, `email-verify-ip:${request.ip}`, VERIFICATIONS_PER_IP, at)
    const newEmail = await this.changes.consume(user.id, codeHash(user.id, code), at, configuration().auth.otpMaxAttempts)
    if (!newEmail) throw new BadRequestException({ ok: false, code: 'OTP_INVALID', message: 'Mã không đúng hoặc đã hết hạn.' })
    if (!await this.changes.swap(user.id, newEmail, emailCodeKey(user.email), 'self', at)) throw new ConflictException(EMAIL_TAKEN)
    const ended = await this.sessions.endOthers(request, user.id)
    await this.mail.enqueue(user.email, 'email_changed_old', { newEmail: maskEmail(newEmail), by: 'self' })
    return { ...await this.accounts.me({ ...user, email: newEmail }), ended }
  }

  /**
   * Support path for someone who lost the old mailbox. No code: the new owner proves the mailbox the first
   * time they reset the password there. Every session ends so nothing signed in under the old address stays.
   */
  async changeForSupport(userId: string, oldEmail: string, newEmail: string, actor: string) {
    if (!await this.changes.swap(userId, newEmail, emailCodeKey(oldEmail), actor, now())) return false
    await this.sessions.endAll(userId)
    await this.mail.enqueue(oldEmail, 'email_changed_old', { newEmail: maskEmail(newEmail), by: 'admin' })
    await this.mail.enqueue(newEmail, 'email_changed_new', { by: 'admin', siteUrl: configuration().siteUrl })
    return true
  }
}
