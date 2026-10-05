import { BadRequestException, Body, Controller, Get, Header, HttpCode, Param, Post, Req } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { parseContributionInput, parseSourceRefs } from './contribution-input'
import { ContributionsService } from './contributions.service'

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 131072 })
  submit(@Body() body: unknown, @Req() request: FastifyRequest) {
    const input = parseContributionInput(body)
    if (!input) throw new BadRequestException({ ok: false, message: 'Đề xuất không hợp lệ hoặc chứa thông tin nhạy cảm.' })
    return this.contributions.submit(input, request.ip)
  }

  @Get('receipt/:code')
  @Header('Cache-Control', 'no-store')
  status(@Param('code') code: string) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(code)) throw new BadRequestException({ ok: false, message: 'Mã biên nhận không hợp lệ.' })
    return this.contributions.status(code)
  }

  @Post('receipt/:code/sources')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RouteConfig({ bodyLimit: 22000 })
  addSources(@Param('code') code: string, @Body() body: unknown) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(code)) throw new BadRequestException({ ok: false, message: 'Mã biên nhận không hợp lệ.' })
    const sources = parseSourceRefs((body as { sourceRefs?: unknown } | null)?.sourceRefs)
    if (!sources) throw new BadRequestException({ ok: false, message: 'Nguồn tham chiếu không hợp lệ.' })
    return this.contributions.addSources(code, sources)
  }

  @Get('ideas')
  @Header('Cache-Control', 'no-store')
  ideas() { return this.contributions.ideas() }
}
