import { Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { AdminAuditRepository } from '../admin/admin-audit.repository'
import { body } from '../admin/admin-input'
import { Actor, Staff, type StaffActor } from '../admin/admin.guard'
import { LANDING_ASSET_MAX_BYTES, LandingsService } from './landings.service'

@Controller('admin/landings')
export class AdminLandingsController {
  constructor(private readonly landings: LandingsService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('landings.manage')
  list() { return this.landings.list() }

  @Post()
  @Staff('landings.manage')
  @RouteConfig({ bodyLimit: 2048 })
  async create(@Actor() actor: StaffActor, @Body() input: unknown) {
    const fields = body(input)
    const result = await this.landings.create(fields.key, fields.name, actor.label)
    await this.audit.record(actor, 'LANDING_CREATED', 'landing', result.landing.key)
    return result
  }

  /** Raw bytes (application/octet-stream), name in X-CN-Filename (URI-encoded) for the type check. */
  @Post('assets')
  @HttpCode(200)
  @Staff('landings.manage')
  @RouteConfig({ bodyLimit: LANDING_ASSET_MAX_BYTES + 1024 })
  async upload(@Actor() actor: StaffActor, @Body() input: unknown, @Req() request: FastifyRequest) {
    const result = await this.landings.uploadAsset(request.headers['x-cn-filename'], input, actor.label)
    await this.audit.record(actor, 'LANDING_ASSET_UPLOADED', 'landing', null, result.asset.id)
    return result
  }

  @Get(':key')
  @Staff('landings.manage')
  get(@Param('key') key: string) { return this.landings.get(key) }

  @Put(':key')
  @Staff('landings.manage')
  @RouteConfig({ bodyLimit: 64 * 1024 })
  async save(@Actor() actor: StaffActor, @Param('key') key: string, @Body() input: unknown) {
    const fields = body(input)
    const result = await this.landings.saveDraft(key, { name: fields.name, draft: fields.draft, baseRev: fields.baseRev }, actor.label)
    await this.audit.record(actor, 'LANDING_DRAFT_SAVED', 'landing', key, `rev ${result.landing.rev}`)
    return result
  }

  @Post(':key/publish')
  @HttpCode(200)
  @Staff('landings.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async publish(@Actor() actor: StaffActor, @Param('key') key: string, @Body() input: unknown) {
    const result = await this.landings.publish(key, body(input).baseRev, actor.label)
    await this.audit.record(actor, 'LANDING_PUBLISHED', 'landing', key, `rev ${result.landing.rev}`)
    return result
  }

  @Post(':key/unpublish')
  @HttpCode(200)
  @Staff('landings.manage')
  async unpublish(@Actor() actor: StaffActor, @Param('key') key: string) {
    const result = await this.landings.unpublish(key)
    await this.audit.record(actor, 'LANDING_UNPUBLISHED', 'landing', key)
    return result
  }
}
