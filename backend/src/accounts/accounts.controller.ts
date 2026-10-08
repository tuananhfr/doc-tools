import { BadRequestException, Body, Controller, Get, Header, Patch, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AccountsService } from './accounts.service'
import { parseProfileInput } from './profile-input'
import { UsersRepository } from './users.repository'

@Controller('me')
export class AccountsController {
  constructor(private readonly sessions: SessionService, private readonly accounts: AccountsService, private readonly users: UsersRepository) {}

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
}
