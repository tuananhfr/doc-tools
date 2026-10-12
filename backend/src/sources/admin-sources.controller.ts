import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { AdminAuditRepository } from '../admin/admin-audit.repository'
import { Actor, Staff, type StaffActor } from '../admin/admin.guard'
import { SourcesService } from './sources.service'

// No DELETE: packages signed with a sourceId must keep resolving; retire a source with status 'revoked'.
@Controller('admin/sources')
export class AdminSourcesController {
  constructor(private readonly sources: SourcesService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('rules.manage')
  list() { return this.sources.list() }

  @Post()
  @HttpCode(201)
  @Staff('rules.manage')
  @RouteConfig({ bodyLimit: 8192 })
  async create(@Actor() actor: StaffActor, @Body() input: unknown) {
    const result = await this.sources.create(input, actor.label)
    await this.audit.record(actor, 'SOURCE_CREATED', 'source', result.source.sourceId)
    return result
  }

  @Get(':id')
  @Staff('rules.manage')
  get(@Param('id') id: string) { return this.sources.get(id) }

  @Put(':id')
  @Staff('rules.manage')
  @RouteConfig({ bodyLimit: 8192 })
  async update(@Actor() actor: StaffActor, @Param('id') id: string, @Body() input: unknown) {
    const result = await this.sources.update(id, input, actor.label)
    await this.audit.record(actor, 'SOURCE_UPDATED', 'source', result.source.sourceId, result.source.status)
    return result
  }
}
