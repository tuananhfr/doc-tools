import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, HttpException, Logger, Patch, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AccountDeletionService } from './account-deletion.service'
import { AccountsService } from './accounts.service'
import { normalizeEmail, parseProfileInput } from './profile-input'
import { UsersRepository } from './users.repository'

@Controller('me')
export class AccountsController {
  private readonly logger = new Logger('Accounts')

  constructor(private readonly sessions: SessionService, private readonly accounts: AccountsService, private readonly users: UsersRepository,
    private readonly deletion: AccountDeletionService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async me(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.accounts.me(await this.sessions.current(request, reply))
  }

  @Patch()
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  async update(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) throw new UnauthorizedException({ ok: false, message: 'Bạn cần đăng nhập.' })
    const input = parseProfileInput(body)
    if (!input) throw new BadRequestException({ ok: false, message: 'Tên hiển thị không hợp lệ (tối đa 80 ký tự).' })
    await this.users.updateProfile(user.id, input)
    return this.accounts.me({ ...user, ...input })
  }

  /**
   * Self-service deletion, confirmed by typing the account's email. Staff accounts are refused so the
   * last owner can never disappear this way; their role is removed by another owner first.
   */
  @Delete()
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async remove(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const user = await this.sessions.current(request)
    if (!user) throw new UnauthorizedException({ ok: false, code: 'SIGNED_OUT', message: 'Bạn cần đăng nhập.' })
    if (user.role) throw new HttpException({ ok: false, code: 'STAFF_ACCOUNT', message: 'Tài khoản quản trị không tự xoá được. Hãy nhờ một owner gỡ vai trò trước.' }, 409)
    const confirm = normalizeEmail((body as { confirmEmail?: unknown } | null)?.confirmEmail)
    if (confirm !== user.email) throw new BadRequestException({ ok: false, code: 'CONFIRM_MISMATCH', message: 'Gõ đúng email của tài khoản để xác nhận xoá.' })
    try { await this.deletion.delete(user.id, 'self') } catch (error) {
      // Cleanup runs before any row goes, so a failure leaves the account whole and the person can retry.
      this.logger.warn(`self deletion failed: ${error instanceof Error ? error.message : String(error)}`)
      throw new HttpException({ ok: false, code: 'DELETE_FAILED', message: 'Chưa xoá được tài khoản lúc này. Hãy thử lại sau ít phút.' }, 502)
    }
    await this.sessions.end(request, reply)
    return { ok: true }
  }
}
