import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { PROMPT_VERSION } from '../ai/agent-profile'
import { AiReconcileService } from '../ai/ai-reconcile.service'
import { AiRepository } from '../ai/ai.repository'
import { AiService } from '../ai/ai.service'
import { GoclawClient } from '../ai/goclaw.client'
import { configuration } from '../config/configuration'
import { AdminAuditRepository } from './admin-audit.repository'
import { ADMIN_PAGE_SIZE, parseChoice, parsePage, parseUuid } from './admin-input'
import { Actor, Staff, type StaffActor } from './admin.guard'

@Controller('admin/ai')
export class AdminAiController {
  constructor(private readonly repository: AiRepository, private readonly ai: AiService, private readonly goclaw: GoclawClient, private readonly audit: AdminAuditRepository,
    private readonly reconcile: AiReconcileService) {}

  @Get()
  @Staff('ai.view')
  async list(@Query() query: Record<string, unknown>) {
    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 254) : ''
    const page = parsePage(query.page)
    const status = parseChoice(query.status, ['verifying', 'ready', 'failed', 'disabled'] as const)
    const result = await this.repository.list({ q: q || undefined, status, page, pageSize: ADMIN_PAGE_SIZE })
    return { ok: true, page, pageSize: ADMIN_PAGE_SIZE, promptVersion: PROMPT_VERSION, ...result }
  }

  /**
   * Live view of the shared GoClaw. `background.provider` is reported, never changed here: when unset,
   * GoClaw's background jobs pick a random provider of the tenant, possibly a customer's key.
   */
  @Get('status')
  @Staff('ai.view')
  async status() {
    const config = configuration()
    const base = { configured: this.goclaw.configured(), url: config.goclaw.url, publicWsUrl: config.goclaw.publicWsUrl || null,
      mcpPublicUrl: config.mcp.publicUrl || null, mcpServerName: config.mcp.serverName, allowPrivateApiBase: config.ai.allowPrivateApiBase, promptVersion: PROMPT_VERSION,
      reconcile: this.reconcile.lastRun }
    if (!base.configured) return { ok: true, ...base, reachable: false, mcpRegistered: false, backgroundProvider: null, error: null }
    try {
      const [servers, backgroundProvider] = await Promise.all([this.goclaw.listMcpServers(), this.goclaw.systemConfig('background.provider')])
      const server = servers.find((entry) => entry.name === config.mcp.serverName)
      return { ok: true, ...base, reachable: true, mcpRegistered: Boolean(server), mcpEnabled: server?.enabled ?? null, mcpUrl: server?.url ?? null, backgroundProvider, error: null }
    } catch (error) {
      return { ok: true, ...base, reachable: false, mcpRegistered: false, backgroundProvider: null, error: error instanceof Error ? error.message.slice(0, 300) : 'error' }
    }
  }

  @Post(':userId/disable')
  @HttpCode(200)
  @Staff('ai.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async disable(@Actor() actor: StaffActor, @Param('userId') userId: string) {
    const id = parseUuid(userId)
    await this.ai.disableByStaff(id)
    await this.audit.record(actor, 'AI_DISABLE', 'ai', id)
    return { ok: true }
  }

  @Post(':userId/enable')
  @HttpCode(200)
  @Staff('ai.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async enable(@Actor() actor: StaffActor, @Param('userId') userId: string) {
    const id = parseUuid(userId)
    await this.ai.enableByStaff(id)
    await this.audit.record(actor, 'AI_ENABLE', 'ai', id)
    return { ok: true }
  }
}
