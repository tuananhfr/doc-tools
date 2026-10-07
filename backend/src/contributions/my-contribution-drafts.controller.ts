import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { ContributionDraftsService } from './contribution-drafts.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const TOOL_ID = /^[a-z0-9][a-z0-9-]{0,47}$/

/**
 * Drafts need only a session, not Pro: one written while Pro was active can still be sent or thrown
 * away after it ends. Only the agent (Pro) creates them.
 */
@Controller('me/contribution-drafts')
export class MyContributionDraftsController {
  constructor(private readonly drafts: ContributionDraftsService, private readonly sessions: SessionService) {}

  private async user(request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) throw new UnauthorizedException({ ok: false, code: 'SIGNED_OUT', message: 'Bạn cần đăng nhập.' })
    return user
  }

  private id(value: string) {
    if (!UUID.test(value)) throw new BadRequestException({ ok: false, code: 'NOT_FOUND', message: 'Mã nháp không hợp lệ.' })
    return value
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: FastifyRequest, @Query('toolId') toolId?: string) {
    const user = await this.user(request)
    if (toolId !== undefined && !TOOL_ID.test(toolId)) throw new BadRequestException({ ok: false, message: 'Công cụ không hợp lệ.' })
    return this.drafts.list(user.id, toolId ?? null)
  }

  @Post(':id/submit')
  @UseGuards(TrustedWriteGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 4096 })
  async submit(@Param('id') id: string, @Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    const input = (body ?? {}) as { selectedIndexes?: unknown; attribution?: unknown }
    const selected = input.selectedIndexes
    if (!Array.isArray(selected) || selected.length > 50 || selected.some((index) => !Number.isInteger(index) || index < 0)) {
      throw new BadRequestException({ ok: false, code: 'SELECTION_INVALID', message: 'Hãy chọn ít nhất một thay đổi.' })
    }
    return this.drafts.submit(user.id, this.id(id), selected as number[], input.attribution === true)
  }

  @Delete(':id')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('id') id: string, @Req() request: FastifyRequest) {
    const user = await this.user(request)
    return this.drafts.remove(user.id, this.id(id))
  }
}
