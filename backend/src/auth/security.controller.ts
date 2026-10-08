import { BadRequestException, Body, Controller, Delete, Header, HttpCode, HttpException, Logger, Post, Put, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { normalizeEmail } from '../accounts/profile-input'
import { UsersRepository } from '../accounts/users.repository'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AuthService } from './auth.service'
import { EmailChangeService } from './email-change.service'

const SIGNED_OUT = { ok: false, code: 'SIGNED_OUT', message: 'Bạn cần đăng nhập.' }

/** Account changes that need the password; lives here because AuthService owns password checks. */
@Controller('me')
@UseGuards(TrustedWriteGuard)
export class SecurityController {
  private readonly logger = new Logger('Accounts')

  constructor(private readonly auth: AuthService, private readonly sessions: SessionService, private readonly users: UsersRepository,
    private readonly deletion: AccountDeletionService, private readonly emailChange: EmailChangeService) {}

  private async user(request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) throw new UnauthorizedException(SIGNED_OUT)
    return user
  }

  /** Other devices are signed out too: a password change usually means someone else may know the old one. */
  @Put('password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  async changePassword(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    const input = (body ?? {}) as { currentPassword?: unknown; newPassword?: unknown }
    if (typeof input.newPassword !== 'string') throw new BadRequestException({ ok: false, code: 'PASSWORD_TOO_SHORT', message: 'Mật khẩu cần ít nhất 8 ký tự.' })
    await this.auth.changePassword(user, input.currentPassword, input.newPassword)
    return { ok: true, ended: await this.sessions.endOthers(request, user.id) }
  }

  /** Step one of changing the sign-in email: password here, then a code sent to the new address. */
  @Post('email')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  async requestEmailChange(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    const input = (body ?? {}) as { email?: unknown; password?: unknown; locale?: unknown }
    const email = normalizeEmail(input.email)
    if (!email) throw new BadRequestException({ ok: false, code: 'EMAIL_INVALID', message: 'Email không hợp lệ.' })
    return this.emailChange.request(user, email, input.password, input.locale === 'vi' ? 'vi' : 'en', request.ip)
  }

  @Post('email/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 1024 })
  async confirmEmailChange(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    const code = (body as { code?: unknown } | null)?.code
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) throw new BadRequestException({ ok: false, code: 'OTP_INVALID', message: 'Mã gồm 6 chữ số.' })
    return this.emailChange.confirm(request, user, code.trim())
  }

  @Post('sessions/end-others')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async endOthers(@Req() request: FastifyRequest) {
    const user = await this.user(request)
    const ended = await this.sessions.endOthers(request, user.id)
    await this.users.audit(user.id, 'SESSIONS_ENDED', 'self')
    return { ok: true, ended }
  }

  /**
   * Self-service deletion, confirmed by the password. Staff accounts are refused so the last owner can
   * never disappear this way; their role is removed by another owner first.
   */
  @Delete()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  async remove(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const user = await this.user(request)
    if (user.role) throw new HttpException({ ok: false, code: 'STAFF_ACCOUNT', message: 'Tài khoản quản trị không tự xoá được. Hãy nhờ một owner gỡ vai trò trước.' }, 409)
    await this.auth.confirmPassword(user.id, (body as { password?: unknown } | null)?.password)
    try { await this.deletion.delete(user.id, 'self') } catch (error) {
      // Cleanup runs before any row goes, so a failure leaves the account whole and the person can retry.
      this.logger.warn(`self deletion failed: ${error instanceof Error ? error.message : String(error)}`)
      throw new HttpException({ ok: false, code: 'DELETE_FAILED', message: 'Chưa xoá được tài khoản lúc này. Hãy thử lại sau ít phút.' }, 502)
    }
    await this.sessions.end(request, reply)
    return { ok: true }
  }
}
