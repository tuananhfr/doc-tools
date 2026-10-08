import { BadRequestException, Body, Controller, Header, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { normalizeEmail } from '../accounts/profile-input'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AuthService } from './auth.service'

const INVALID_EMAIL = { ok: false, code: 'EMAIL_INVALID', message: 'Email không hợp lệ.' }

@Controller('auth')
@UseGuards(TrustedWriteGuard)
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly sessions: SessionService) {}

  @Post('otp/request')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  request(@Body() body: unknown, @Req() request: FastifyRequest) {
    const input = (body ?? {}) as { email?: unknown; locale?: unknown }
    const email = normalizeEmail(input.email)
    if (!email) throw new BadRequestException(INVALID_EMAIL)
    return this.auth.requestCode(email, input.locale === 'vi' ? 'vi' : 'en', request.ip)
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  login(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = (body ?? {}) as { email?: unknown; password?: unknown }
    const email = normalizeEmail(input.email)
    if (!email) throw new BadRequestException(INVALID_EMAIL)
    // A malformed password is just a wrong one; the cap keeps scrypt from hashing megabytes.
    if (typeof input.password !== 'string' || !input.password || input.password.length > 1024) {
      throw new UnauthorizedException({ ok: false, code: 'LOGIN_FAILED', message: 'Email hoặc mật khẩu không đúng.' })
    }
    return this.auth.login(email, input.password, request.ip, reply)
  }

  /** Sign-up and forgot-password share this step: the emailed code plus the password to keep. */
  @Post('password/setup')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  setup(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const input = (body ?? {}) as { email?: unknown; code?: unknown; password?: unknown }
    const email = normalizeEmail(input.email)
    if (!email) throw new BadRequestException(INVALID_EMAIL)
    if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code.trim())) throw new BadRequestException({ ok: false, code: 'OTP_INVALID', message: 'Mã gồm 6 chữ số.' })
    if (typeof input.password !== 'string') throw new BadRequestException({ ok: false, code: 'PASSWORD_TOO_SHORT', message: 'Mật khẩu cần ít nhất 8 ký tự.' })
    return this.auth.setupPassword(email, input.code.trim(), input.password, request.ip, reply)
  }

  @Post('logout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.sessions.end(request, reply)
    return { ok: true }
  }
}
