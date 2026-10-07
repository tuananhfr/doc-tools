import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { ContributionStatus } from '../contributions/contributions.repository'
import { body, invalid, parseChoice, parseNote, parsePage, parseUuid } from './admin-input'
import { AdminContributionsService, TRANSITIONS } from './admin-contributions.service'
import { Actor, Staff, type StaffActor } from './admin.guard'

const STATUSES: ContributionStatus[] = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED']

@Controller('admin/contributions')
export class AdminContributionsController {
  constructor(private readonly contributions: AdminContributionsService) {}

  @Get()
  @Staff('contributions.review')
  list(@Query() query: Record<string, unknown>) {
    const domain = typeof query.domain === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(query.domain) ? query.domain : undefined
    return this.contributions.list({ status: parseChoice(query.status, STATUSES), domain, queue: parseChoice(query.queue, ['open'] as const) }, parsePage(query.page))
  }

  @Get(':id')
  @Staff('contributions.review')
  detail(@Param('id') id: string) { return this.contributions.detail(parseUuid(id)) }

  @Post(':id/transition')
  @HttpCode(200)
  @Staff('contributions.review')
  @RouteConfig({ bodyLimit: 4096 })
  transition(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    const data = body(input)
    const action = parseChoice(data.action, TRANSITIONS)
    if (!action) invalid('Thiếu bước duyệt.')
    const note = parseNote(data.note, 2000, action === 'verify' || action === 'reject')
    const digest = typeof data.digest === 'string' ? data.digest.trim().toLowerCase() : null
    return this.contributions.transition(actor, parseUuid(id), action, note, digest)
  }
}
