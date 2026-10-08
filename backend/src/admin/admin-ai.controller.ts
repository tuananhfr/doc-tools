import { BadGatewayException, Controller, Get, HttpCode, Param, Post, Query, ServiceUnavailableException } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { PROMPT_VERSION } from '../ai/agent-profile'
import { AiReconcileService } from '../ai/ai-reconcile.service'
import { AiRepository } from '../ai/ai.repository'
import { AiService } from '../ai/ai.service'
import { GoclawClient, GoclawError } from '../ai/goclaw.client'
import { registerMcpServer } from '../ai/mcp-registration'
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

  /** Same as `npm run ai -- register-mcp`, for owners who never open a shell on the server. */
  @Post('mcp/register')
  @HttpCode(200)
  @Staff('ai.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async registerMcp(@Actor() actor: StaffActor) {
    if (!this.goclaw.configured()) throw new ServiceUnavailableException({ ok: false, code: 'AI_UNAVAILABLE', message: 'Chưa cấu hình GoClaw (địa chỉ và token gateway).' })
    try {
      const result = await registerMcpServer(this.goclaw)
      await this.audit.record(actor, 'MCP_REGISTERED', 'ai', result.id, `${result.action} ${result.url}`)
      return { ok: true, ...result }
    } catch (error) {
      if (!(error instanceof GoclawError)) throw error
      const message = error.status === 400 ? 'Địa chỉ MCP phải là địa chỉ đầy đủ GoClaw gọi tới, kết thúc bằng /api/v1/mcp/sse.' : `GoClaw báo lỗi: ${error.message.slice(0, 200)}`
      throw new BadGatewayException({ ok: false, code: 'GOCLAW_ERROR', message })
    }
  }

  /** Same as `npm run ai -- sync-agents`. */
  @Post('agents/sync')
  @HttpCode(200)
  @Staff('ai.manage')
  @RouteConfig({ bodyLimit: 1024 })
  async syncAgents(@Actor() actor: StaffActor) {
    const result = await this.ai.syncAgents()
    await this.audit.record(actor, 'AGENTS_SYNCED', 'ai', null, `v${PROMPT_VERSION}: ${result.updated} updated, ${result.failed.length} failed`)
    return { ok: true, promptVersion: PROMPT_VERSION, ...result }
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
