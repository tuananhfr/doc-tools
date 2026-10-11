import { Body, Controller, Get, Header, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { EntertainmentRepository } from './entertainment.repository'
import { calculateNumerology } from './engines/numerology-engine'
import { parseDraw } from './engines/deck-engine'
import { solarToLunar } from './engines/lunar-engine'
import { entError, RULE_VERSIONS, entertainmentEnvelope, sessionKey, SOURCE_ID } from './entertainment-policy'
import type { DeckKind } from './entertainment.types'

@Controller('ent')
export class EntertainmentController {
  constructor(private readonly repository: EntertainmentRepository) {}
  @Get('tools')
  @Header('Cache-Control', 'no-store')
  tools() {
    return { ok: true, sources: [{ id: SOURCE_ID, status: 'DRAFT', corpus_available: false }], tools: Object.entries(RULE_VERSIONS).map(([kind, version]) => ({ kind, rule_version: version, available: true, interpretation_available: false })) }
  }
  @Post('numerology/calculate')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(TrustedWriteGuard)
  @RouteConfig({ bodyLimit: 2048 })
  async numerology(@Body() body: unknown, @Req() request: FastifyRequest) {
    const result = calculateNumerology(body)
    await this.repository.rate(request.ip)
    return entertainmentEnvelope(RULE_VERSIONS.numerology, result)
  }
  private draw(kind: DeckKind, body: unknown, request: FastifyRequest) {
    const input = parseDraw(kind, body)
    const { key } = sessionKey(request.headers['idempotency-key'])
    return this.repository.draw(kind, input, key, request.ip)
  }
  @Post('cards/draw')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(TrustedWriteGuard)
  cards(@Body() body: unknown, @Req() request: FastifyRequest) { return this.draw('cards', body, request) }
  @Post('tarot/draw')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(TrustedWriteGuard)
  tarot(@Body() body: unknown, @Req() request: FastifyRequest) { return this.draw('tarot', body, request) }
  @Get('almanac/day')
  @Header('Cache-Control', 'no-store')
  async calendar(@Query('date') date: unknown, @Req() request: FastifyRequest) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) entError(400, 'INVALID_DATE')
    const [year, month, day] = date.split('-').map(Number)
    const lunar = solarToLunar({ year, month, day })
    if (!lunar) entError(422, 'INVALID_DATE')
    await this.repository.rate(request.ip)
    return entertainmentEnvelope(RULE_VERSIONS.calendar, { date, timezone: 'Asia/Ho_Chi_Minh', lunar, folk_rules: { status: 'BLOCKED', reason: 'APPROVED_CORPUS_REQUIRED' } })
  }
  @Post('reports')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @UseGuards(TrustedWriteGuard)
  async report(@Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !('draw_key' in body)) entError(400, 'INVALID_REPORT')
    const { key } = sessionKey((body as { draw_key: unknown }).draw_key)
    return this.repository.report(key)
  }
}
