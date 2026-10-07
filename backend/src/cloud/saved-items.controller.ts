import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { PlansRepository } from '../accounts/plans.repository'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { cloudError, MAX_PAYLOAD_BYTES, SavedItemsService } from './saved-items.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Twice the payload cap, so a payload somewhat over it still reaches the service and gets its own
// error code instead of Fastify's bare 413.
const WRITE_BODY_LIMIT = MAX_PAYLOAD_BYTES * 2 + 4096

/**
 * Reading and deleting need only a session, so items stay reachable (read-only) after Pro ends;
 * saving and editing need Pro, checked on every call.
 */
@Controller('me/saved')
export class SavedItemsController {
  constructor(private readonly items: SavedItemsService, private readonly sessions: SessionService, private readonly plans: PlansRepository) {}

  private async signedIn(request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) cloudError(401, 'SIGNED_OUT', 'Bạn cần đăng nhập.')
    return user
  }

  private async isPro(userId: string) {
    return await this.plans.proEndsAt(userId, Math.floor(Date.now() / 1000)) !== null
  }

  private async pro(request: FastifyRequest) {
    const user = await this.signedIn(request)
    if (!await this.isPro(user.id)) cloudError(403, 'PRO_REQUIRED', 'Lưu lên tài khoản dành cho tài khoản Pro.')
    return user
  }

  private id(value: string) {
    if (!UUID.test(value)) cloudError(404, 'NOT_FOUND', 'Mục này không còn (có thể đã bị xoá ở thiết bị khác).')
    return value
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return this.items.list(user.id, await this.isPro(user.id))
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async get(@Param('id') id: string, @Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return this.items.get(user.id, this.id(id))
  }

  @Post()
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: WRITE_BODY_LIMIT })
  async create(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    const input = (body ?? {}) as Record<string, unknown>
    return this.items.saveResult(user.id, { toolId: input.toolId, title: input.title, payload: input.payload })
  }

  @Patch(':id')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: WRITE_BODY_LIMIT })
  async update(@Param('id') id: string, @Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    const input = (body ?? {}) as Record<string, unknown>
    return this.items.update(user.id, this.id(id), { title: input.title, payload: input.payload, baseRev: input.baseRev, force: input.force })
  }

  @Delete(':id')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('id') id: string, @Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return this.items.remove(user.id, this.id(id))
  }

  @Put('bookmarks/:toolId')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async bookmark(@Param('toolId') toolId: string, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return this.items.bookmark(user.id, toolId)
  }

  @Delete('bookmarks/:toolId')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async unbookmark(@Param('toolId') toolId: string, @Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return this.items.unbookmark(user.id, toolId)
  }
}
