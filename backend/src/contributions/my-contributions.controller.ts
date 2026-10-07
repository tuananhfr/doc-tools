import { BadRequestException, Body, Controller, Get, Header, HttpCode, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { parseSourceRefs } from './contribution-input'
import { ContributionsService } from './contributions.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

@Controller('me/contributions')
export class MyContributionsController {
  constructor(private readonly contributions: ContributionsService, private readonly sessions: SessionService) {}

  private async user(request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) throw new UnauthorizedException({ ok: false, code: 'SIGNED_OUT', message: 'Bạn cần đăng nhập.' })
    return user
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: FastifyRequest, @Query('page') rawPage?: string) {
    const user = await this.user(request)
    const page = rawPage === undefined ? 1 : Number(rawPage)
    if (!Number.isInteger(page) || page < 1 || page > 1000) throw new BadRequestException({ ok: false, message: 'Trang không hợp lệ.' })
    return this.contributions.mine(user.id, page)
  }

  @Post(':id/evidence')
  @UseGuards(TrustedWriteGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 22000 })
  async addEvidence(@Param('id') id: string, @Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    if (!UUID.test(id)) throw new BadRequestException({ ok: false, message: 'Mã đề xuất không hợp lệ.' })
    const sources = parseSourceRefs((body as { sourceRefs?: unknown } | null)?.sourceRefs)
    if (!sources) throw new BadRequestException({ ok: false, code: 'SOURCE_INVALID', message: 'Nguồn tham chiếu không hợp lệ.' })
    return this.contributions.addEvidence(user.id, id, sources)
  }
}
