import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { createHmac, randomInt } from 'node:crypto'
import type { FastifyReply } from 'fastify'
import { AccountsService } from '../accounts/accounts.service'
import { UsersRepository } from '../accounts/users.repository'
import { configuration } from '../config/configuration'
import { MailService } from '../mail/mail.service'
import { RolesRepository } from '../roles/roles.repository'
import { SettingsService } from '../settings/settings.service'
import type { MailLocale } from '../mail/mail-templates'
import { SessionService } from '../session/session.service'
import { AuthFloodRepository } from './auth-flood.repository'
import { OtpRepository } from './otp.repository'

// Limits are per rolling window; together they cap brute force at a few dozen guesses per hour per email.
const REQUESTS_PER_EMAIL = { limit: 3, window: 900 }
const REQUESTS_PER_IP = { limit: 10, window: 3600 }
const VERIFICATIONS_PER_IP = { limit: 30, window: 3600 }

function hmac(value: string) { return createHmac('sha256', configuration().visitHashSecret).update(value).digest('hex') }

@Injectable()
export class AuthService {
  constructor(
    private readonly otps: OtpRepository,
    private readonly flood: AuthFloodRepository,
    private readonly mail: MailService,
    private readonly users: UsersRepository,
    private readonly sessions: SessionService,
    private readonly accounts: AccountsService,
    private readonly roles: RolesRepository,
    private readonly settings: SettingsService,
  ) {}

  /** Closed sign-up keeps existing accounts working; only unknown emails are turned away. */
  private async mayCreate(email: string) {
    return await this.settings.get('auth.signupOpen') || Boolean(await this.users.findByEmail(email))
  }

  private async limit(key: string, rule: { limit: number; window: number }, now: number) {
    if (!await this.flood.hit(hmac(key), rule.limit, rule.window, now)) {
      throw new HttpException({ ok: false, code: 'RATE_LIMITED', message: 'Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.' }, HttpStatus.TOO_MANY_REQUESTS)
    }
  }

  /** Same answer whether or not the email has an account, so the endpoint cannot enumerate users. */
  async requestCode(email: string, locale: MailLocale, ip: string) {
    const now = Math.floor(Date.now() / 1000)
    await this.limit(`otp-ip:${ip}`, REQUESTS_PER_IP, now)
    await this.limit(`otp-email:${email}`, REQUESTS_PER_EMAIL, now)
    const { otpTtlSeconds } = configuration().auth
    // Same answer either way, so a closed sign-up does not reveal which emails have accounts.
    if (!await this.mayCreate(email)) return { ok: true }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await this.otps.issue(hmac(`email:${email}`), hmac(`otp:${email}:${code}`), now, now + otpTtlSeconds)
    await this.mail.enqueue(email, 'otp', { code, locale, ttlMinutes: Math.round(otpTtlSeconds / 60) }, now + otpTtlSeconds)
    return { ok: true }
  }

  async verifyCode(email: string, code: string, ip: string, reply: FastifyReply) {
    const now = Math.floor(Date.now() / 1000)
    await this.limit(`verify-ip:${ip}`, VERIFICATIONS_PER_IP, now)
    const { otpMaxAttempts } = configuration().auth
    if (!await this.otps.consume(hmac(`email:${email}`), hmac(`otp:${email}:${code}`), now, otpMaxAttempts)) {
      throw new BadRequestException({ ok: false, code: 'OTP_INVALID', message: 'Mã không đúng hoặc đã hết hạn.' })
    }
    if (!await this.mayCreate(email)) throw new ForbiddenException({ ok: false, code: 'SIGNUP_CLOSED', message: 'Chuyện Nhỏ tạm ngừng nhận tài khoản mới.' })
    const user = await this.users.findOrCreate(email)
    if (user.status !== 'active') throw new ForbiddenException({ ok: false, code: 'ACCOUNT_DISABLED', message: 'Tài khoản này đã bị khoá. Liên hệ contact@lpc.vn.' })
    await this.users.markLogin(user.id)
    await this.users.audit(user.id, 'LOGIN', 'self')
    await this.sessions.start(user.id, reply)
    return this.accounts.me({ id: user.id, email: user.email, displayName: user.displayName, publicAttribution: user.publicAttribution, role: await this.roles.roleOf(user.id) })
  }
}
