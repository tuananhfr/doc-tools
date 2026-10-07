import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PlansRepository } from '../accounts/plans.repository'
import { configuration } from '../config/configuration'
import { SessionService } from '../session/session.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { AiUploadsService } from './ai-uploads.service'
import { AiService, aiError } from './ai.service'
import { PROVIDER_TYPES } from './provider-types'

@Controller('ai')
export class AiController {
  constructor(private readonly sessions: SessionService, private readonly plans: PlansRepository, private readonly ai: AiService, private readonly uploads: AiUploadsService) {}

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

  @Post('source-checks')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 2048 })
  async sourceCheck(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    const input = (body ?? {}) as Record<string, unknown>
    return this.ai.recordSourceCheck(user.id, { toolId: input.toolId, baseSnapshotId: input.baseSnapshotId, sessionKey: input.sessionKey })
  }

  @Post('session')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async session(@Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return this.ai.session(user.id)
  }

  /** Raw bytes (application/octet-stream), name in X-CN-Filename (URI-encoded); the service enforces the configured size. */
  @Post('uploads')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 10 * 1024 * 1024 })
  async upload(@Body() body: unknown, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return this.uploads.upload(user.id, request.headers['x-cn-filename'], body)
  }

  @Post('uploads/:id/link')
  @HttpCode(200)
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async uploadLink(@Param('id') id: string, @Req() request: FastifyRequest) {
    const user = await this.pro(request)
    return this.uploads.link(user.id, id)
  }

  /** Not Pro-gated, so people can still clear what they attached after their plan ends. */
  @Delete('uploads/:id')
  @UseGuards(TrustedWriteGuard)
  @Header('Cache-Control', 'no-store')
  async removeUpload(@Param('id') id: string, @Req() request: FastifyRequest) {
    const user = await this.signedIn(request)
    return this.uploads.remove(user.id, id)
  }

  /** Fetched by GoClaw, not the browser; the trailing name only gives GoClaw a file extension. */
  @Get('uploads/:id/raw/:token/:name')
  async rawUpload(@Param('id') id: string, @Param('token') token: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const allowed = configuration().mcp.allowedIps
    if (allowed.length && !allowed.includes(request.ip)) return reply.code(403).send({ ok: false, code: 'FORBIDDEN' })
    const opened = await this.uploads.open(id, token)
    if (!opened) return reply.code(404).send({ ok: false, code: 'NOT_FOUND' })
    return reply.headers({
      'content-type': opened.upload.mimeType,
      'content-length': String(opened.upload.size), 'content-disposition': 'attachment', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store',
    }).send(opened.stream)
  }
}
