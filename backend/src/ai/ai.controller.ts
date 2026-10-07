import { Body, Controller, Delete, Get, Header, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { PlansRepository } from '../accounts/plans.repository'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AiService, aiError } from './ai.service'
import { PROVIDER_TYPES } from './provider-types'

@Controller('ai')
export class AiController {
  constructor(private readonly sessions: SessionService, private readonly plans: PlansRepository, private readonly ai: AiService) {}

  private async signedIn(request: FastifyRequest) {
    const user = await this.sessions.current(request)
    if (!user) aiError(401, 'SIGNED_OUT', 'Bạn cần đăng nhập.')
    return user
  }

  /** Pro is checked on every call, so an expired plan stops new chats at once. */
  private async pro(request: FastifyRequest) {
    const user = await this.signedIn(request)
    if (await this.plans.proEndsAt(user.id, Math.floor(Date.now() / 1000)) === null) aiError(403, 'PRO_REQUIRED', 'Trợ lý AI dành cho tài khoản Pro.')
    return user
  }

  @Get('provider-types')
  @Header('Cache-Control', 'public, max-age=3600')
  providerTypes() {
    return { ok: true, items: PROVIDER_TYPES.map(({ type, label, apiBase, customBase }) => ({ type, label, apiBase, customBase })) }
  }

  /** Readable after Pro ends too, so people can still see and remove the key they left behind. */
  @Get('setup')
  @Header('Cache-Control', 'no-store')
  async setup(@Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return { ok: true, ...(await this.ai.setup(user.id)) }
  }

  @Put('provider')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 4096 })
  async saveProvider(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    const input = (body ?? {}) as Record<string, unknown>
    return { ok: true, ...(await this.ai.saveProvider(user.id, { type: input.type, apiKey: input.apiKey, apiBase: input.apiBase })) }
  }

  @Post('provider/verify')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async verify(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return { ok: true, ...(await this.ai.verify(user.id, (body as Record<string, unknown> | null)?.model)) }
  }

  @Delete('provider')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async removeProvider(@Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return { ok: true, ...(await this.ai.removeProvider(user.id)) }
  }

  @Post('session')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async session(@Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return this.ai.session(user.id)
  }
}
