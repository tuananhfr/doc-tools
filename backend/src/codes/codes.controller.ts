import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { CodesService } from './codes.service'

@Controller('codes')
export class CodesController {
  constructor(private readonly codes: CodesService) {}
  @Post()
  @HttpCode(201)
  @RouteConfig({ bodyLimit: 2048 })
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @UseGuards(TrustedWriteGuard)
  create(@Body() body: unknown, @Req() request: FastifyRequest) { return this.codes.create(body, request.ip) }

  @Get(':token/resolve')
  async resolve(@Param('token') token: string, @Res({ passthrough: true }) reply: FastifyReply) {
    reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Robots-Tag', 'noindex, nofollow')
    const destination = await this.codes.resolve(token)
    reply.status(302).header('Location', destination)
    return { ok: true }
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @RouteConfig({ bodyLimit: 2048 })
  @Header('Cache-Control', 'no-store')
  @UseGuards(TrustedWriteGuard)
  revoke(@Param('id') id: string, @Body() body: unknown) { return this.codes.revoke(id, body) }
}
