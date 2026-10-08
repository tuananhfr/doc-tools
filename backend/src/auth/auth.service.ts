import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { randomInt } from 'node:crypto'
import type { FastifyReply } from 'fastify'
import { AccountsService } from '../accounts/accounts.service'
import { dummyHash, hashPassword, passwordProblem, verifyPassword } from '../accounts/password'
import { PasswordsRepository } from '../accounts/passwords.repository'
import { UsersRepository, type UserRow } from '../accounts/users.repository'
import { configuration } from '../config/configuration'
import { MailService } from '../mail/mail.service'
import { RolesRepository } from '../roles/roles.repository'
import { SettingsService } from '../settings/settings.service'
import type { MailLocale } from '../mail/mail-templates'
import { SessionService } from '../session/session.service'
import { AuthFloodRepository } from './auth-flood.repository'
import { authHash as hmac, emailCodeKey } from './auth-hash'
import { OtpRepository } from './otp.repository'
import { enforceLimit, type RateRule } from './rate-limit'

// Limits are per rolling window; together they cap brute force at a few dozen guesses per hour per email.
const REQUESTS_PER_EMAIL = { limit: 3, window: 900 }
const REQUESTS_PER_IP = { limit: 10, window: 3600 }
const VERIFICATIONS_PER_IP = { limit: 30, window: 3600 }
// No hard lockout: anyone could lock a stranger out by typing their email. The per-email cap only slows
// a guesser spread over many addresses; one address is held back by the email + IP pair first.
const LOGINS_PER_IP = { limit: 30, window: 900 }
const LOGINS_PER_EMAIL_IP = { limit: 10, window: 900 }
const LOGINS_PER_EMAIL = { limit: 30, window: 3600 }
const PASSWORD_CHECKS_PER_USER = { limit: 10, window: 900 }

const LOGIN_FAILED = { ok: false, code: 'LOGIN_FAILED', message: 'Email hoặc mật khẩu không đúng.' }
const ACCOUNT_DISABLED = { ok: false, code: 'ACCOUNT_DISABLED', message: 'Tài khoản này đã bị khoá. Liên hệ contact@lpc.vn.' }
const PASSWORD_MESSAGES = {
  PASSWORD_TOO_SHORT: 'Mật khẩu cần ít nhất 8 ký tự.',
  PASSWORD_TOO_LONG: 'Mật khẩu dài tối đa 128 ký tự.',
  PASSWORD_COMMON: 'Mật khẩu này quá dễ đoán. Hãy chọn mật khẩu khác.',
}

const now = () => Math.floor(Date.now() / 1000)

@Injectable()
export class AuthService {
  constructor(
    private readonly otps: OtpRepository,
    private readonly flood: AuthFloodRepository,
    private readonly mail: MailService,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordsRepository,
    private readonly sessions: SessionService,
    private readonly accounts: AccountsService,
    private readonly roles: RolesRepository,
    private readonly settings: SettingsService,
  ) {}

  /** Closed sign-up keeps existing accounts working; only unknown emails are turned away. */
  private async mayCreate(email: string) {
    return await this.settings.get('auth.signupOpen') || Boolean(await this.users.findByEmail(email))
  }

  private limit(key: string, rule: RateRule, at: number) { return enforceLimit(this.flood, key, rule, at) }

  private assertStrong(password: string, email: string) {
    const problem = passwordProblem(password, email)
    if (problem) throw new BadRequestException({ ok: false, code: problem, message: PASSWORD_MESSAGES[problem] })
  }

  private async signIn(user: UserRow, reply: FastifyReply) {
    await this.users.markLogin(user.id)
    await this.users.audit(user.id, 'LOGIN', 'self')
    await this.sessions.start(user.id, reply)
    return this.accounts.me({ id: user.id, email: user.email, displayName: user.displayName, publicAttribution: user.publicAttribution, role: await this.roles.roleOf(user.id) })
  }

  /**
   * The code only proves the person owns the mailbox: it creates an account or resets a password, it
   * never signs anyone in by itself. Same answer whether or not the email has an account.
   */
  async requestCode(email: string, locale: MailLocale, ip: string) {
    const at = now()
    await this.limit(`otp-ip:${ip}`, REQUESTS_PER_IP, at)
    await this.limit(`otp-email:${email}`, REQUESTS_PER_EMAIL, at)
    const { otpTtlSeconds } = configuration().auth
    if (!await this.mayCreate(email)) return { ok: true }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await this.otps.issue(emailCodeKey(email), hmac(`otp:${email}:${code}`), at, at + otpTtlSeconds)
    await this.mail.enqueue(email, 'otp', { code, locale, ttlMinutes: Math.round(otpTtlSeconds / 60) }, at + otpTtlSeconds)
    return { ok: true }
  }

  /**
   * Code + new password: creates the account on first use, otherwise replaces the password and signs out
   * every device, because a reset is also how someone takes a stolen account back.
   */
  async setupPassword(email: string, code: string, password: string, ip: string, reply: FastifyReply) {
    // Checked before the code is spent, so a rejected password does not cost the person their code.
    this.assertStrong(password, email)
    const at = now()
    await this.limit(`verify-ip:${ip}`, VERIFICATIONS_PER_IP, at)
    const { otpMaxAttempts } = configuration().auth
    if (!await this.otps.consume(emailCodeKey(email), hmac(`otp:${email}:${code}`), at, otpMaxAttempts)) {
      throw new BadRequestException({ ok: false, code: 'OTP_INVALID', message: 'Mã không đúng hoặc đã hết hạn.' })
    }
    if (!await this.mayCreate(email)) throw new ForbiddenException({ ok: false, code: 'SIGNUP_CLOSED', message: 'Chuyện Nhỏ tạm ngừng nhận tài khoản mới.' })
    const user = await this.users.findOrCreate(email)
    if (user.status !== 'active') throw new ForbiddenException(ACCOUNT_DISABLED)
    const hadPassword = await this.passwords.exists(user.id)
    await this.passwords.set(user.id, await hashPassword(password), at)
    await this.sessions.endAll(user.id)
    await this.users.audit(user.id, hadPassword ? 'PASSWORD_RESET' : 'PASSWORD_SET', 'self')
    return this.signIn(user, reply)
  }

  async login(email: string, password: string, ip: string, reply: FastifyReply) {
    const at = now()
    await this.limit(`login-ip:${ip}`, LOGINS_PER_IP, at)
    await this.limit(`login-email-ip:${email}:${ip}`, LOGINS_PER_EMAIL_IP, at)
    await this.limit(`login-email:${email}`, LOGINS_PER_EMAIL, at)
    const user = await this.users.findByEmail(email)
    const stored = user ? await this.passwords.hashOf(user.id) : null
    const matches = await verifyPassword(password, stored ?? await dummyHash())
    if (!user || stored === null || !matches) throw new UnauthorizedException(LOGIN_FAILED)
    // Said only after the right password, so a disabled state never confirms that an email is registered.
    if (user.status !== 'active') throw new ForbiddenException(ACCOUNT_DISABLED)
    return this.signIn(user, reply)
  }

  /** Re-checks the signed-in person's password before a sensitive change; rate limited per account. */
  async confirmPassword(userId: string, password: unknown) {
    await this.limit(`password-check:${userId}`, PASSWORD_CHECKS_PER_USER, now())
    const stored = await this.passwords.hashOf(userId)
    if (stored === null) throw new HttpException({ ok: false, code: 'PASSWORD_NOT_SET', message: 'Tài khoản chưa có mật khẩu. Hãy đặt mật khẩu bằng mã gửi qua email trước.' }, HttpStatus.CONFLICT)
    if (typeof password !== 'string' || password.length > 1024 || !await verifyPassword(password, stored)) {
      throw new BadRequestException({ ok: false, code: 'PASSWORD_WRONG', message: 'Mật khẩu hiện tại không đúng.' })
    }
  }

  async changePassword(user: { id: string; email: string }, currentPassword: unknown, newPassword: string) {
    this.assertStrong(newPassword, user.email)
    await this.confirmPassword(user.id, currentPassword)
    await this.passwords.set(user.id, await hashPassword(newPassword), now())
    await this.users.audit(user.id, 'PASSWORD_CHANGED', 'self')
  }
}
