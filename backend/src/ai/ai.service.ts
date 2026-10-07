import { HttpException, Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { configuration } from '../config/configuration'
import { PROMPT_VERSION, agentDefinition, agentFiles, agentKey, goclawUserId, providerName } from './agent-profile'
import { AiRepository, type ProviderRow } from './ai.repository'
import { checkApiBase } from './api-base'
import { GoclawClient, GoclawError } from './goclaw.client'
import { writeAgentFiles } from './goclaw-files'
import { providerType } from './provider-types'

export const MCP_TOKEN_HEADER = 'X-CN-MCP-Token'

export function aiError(status: number, code: string, message: string): never {
  throw new HttpException({ ok: false, code, message }, status)
}

const API_BASE_MESSAGES = {
  INVALID: 'Địa chỉ API không hợp lệ.',
  NOT_HTTPS: 'Địa chỉ API phải dùng https://.',
  PRIVATE: 'Địa chỉ API phải là máy chủ công khai trên Internet.',
  UNRESOLVED: 'Không tìm thấy máy chủ của địa chỉ API.',
} as const

const MODEL_PATTERN = /^[\w.:/@+-]{1,128}$/

/**
 * Per-user provider + agent in a GoClaw shared with ERPCons. The ordering rules here are the guard
 * rails of docs/pro/pro-spec.md §6.4: GoClaw silently moves an agent whose provider is missing,
 * disabled or keyless onto ANY other provider of the tenant (another customer's key, or ERPCons').
 * So an agent is made inactive before its provider is touched, and a ticket is only minted after
 * checking both still line up.
 */
@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger('AiService')
  private mcpServer: { id: string; at: number } | null = null

  constructor(private readonly repository: AiRepository, private readonly goclaw: GoclawClient, private readonly deletion: AccountDeletionService) {}

  onModuleInit() { this.deletion.addCleanup('ai', (userId) => this.removeEverything(userId)) }

  private requireGoclaw() {
    if (!this.goclaw.configured()) aiError(503, 'AI_UNAVAILABLE', 'Tính năng AI chưa được bật trên máy chủ.')
  }

  /** Turns GoClaw failures into one stable error for the site; the detail goes to the log only. */
  private async remote<T>(label: string, work: () => Promise<T>): Promise<T> {
    try { return await work() } catch (error) {
      if (error instanceof HttpException) throw error
      this.logger.warn(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      aiError(502, 'AI_UPSTREAM', 'Máy chủ AI đang bận hoặc không trả lời. Hãy thử lại sau ít phút.')
    }
  }

  async setup(userId: string) {
    const [provider, agent] = await Promise.all([this.repository.provider(userId), this.repository.agent(userId)])
    return {
      available: this.goclaw.configured(),
      provider: provider ? { type: provider.type, apiBase: provider.apiBase, model: provider.model, status: provider.status, lastError: provider.lastError, verifiedAt: provider.verifiedAt } : null,
      agent: agent ? { status: agent.status, upToDate: agent.promptVersion >= PROMPT_VERSION } : null,
    }
  }

  private refuseIfDisabled(provider: ProviderRow | null) {
    if (provider?.status === 'disabled') aiError(403, 'AI_DISABLED', 'Trợ lý AI của tài khoản này đang bị tạm khoá. Hãy liên hệ contact@lpc.vn.')
  }

  /** Saves (or replaces) the user's key in GoClaw and returns the models the key can see. */
  async saveProvider(userId: string, input: { type: unknown; apiKey: unknown; apiBase: unknown }) {
    this.requireGoclaw()
    const type = providerType(input.type)
    if (!type) aiError(400, 'INVALID_INPUT', 'Loại nhà cung cấp không được hỗ trợ.')
    const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
    if (apiKey.length < 8 || apiKey.length > 500 || /\s/.test(apiKey)) aiError(400, 'INVALID_INPUT', 'Khoá API không hợp lệ.')
    const requestedBase = type.customBase && typeof input.apiBase === 'string' && input.apiBase.trim() ? input.apiBase : type.apiBase
    const base = await checkApiBase(requestedBase, configuration().ai.allowPrivateApiBase)
    if (!base.ok) aiError(400, 'INVALID_API_BASE', API_BASE_MESSAGES[base.reason])

    const existing = await this.repository.provider(userId)
    this.refuseIfDisabled(existing)
    // The new key is unverified: stop the agent before GoClaw sees it.
    await this.deactivateAgent(userId)
    // GoClaw only verifies providers it has loaded, and it loads enabled ones only.
    const id = await this.remote('create provider', () => this.goclaw.createProvider({
      name: providerName(userId), displayName: `Chuyện Nhỏ ${userId.slice(0, 8)}`, type: type.type, apiBase: base.url, apiKey, enabled: true,
    }))
    await this.repository.saveProvider({ userId, goclawProviderId: id, goclawName: providerName(userId), type: type.type, apiBase: base.url, status: 'verifying' })
    const models = await this.remote('list models', () => this.goclaw.listModels(id))
    return { ...(await this.setup(userId)), models: models.slice(0, 300) }
  }

  /** One short chat with the chosen model; on success the agent is created or re-pointed and switched on. */
  async verify(userId: string, modelInput: unknown) {
    this.requireGoclaw()
    const model = typeof modelInput === 'string' ? modelInput.trim() : ''
    if (!MODEL_PATTERN.test(model)) aiError(400, 'INVALID_INPUT', 'Tên model không hợp lệ.')
    const provider = await this.repository.provider(userId)
    if (!provider?.goclawProviderId) aiError(409, 'AI_NO_PROVIDER', 'Hãy lưu khoá API trước.')
    this.refuseIfDisabled(provider)
    const providerId = provider.goclawProviderId
    // A previous failure switched it off, and GoClaw cannot verify a provider it has not loaded.
    if (provider.status === 'failed') await this.remote('enable provider', () => this.goclaw.updateProvider(providerId, { enabled: true }))

    const result = await this.remote('verify provider', () => this.goclaw.verifyProvider(providerId, model))
    if (!result.valid) {
      const detail = (result.error ?? 'Khoá hoặc model không dùng được.').slice(0, 300)
      await this.repository.setProviderStatus(userId, 'failed', { model, lastError: detail })
      // A key that failed is not left enabled for GoClaw's fallback to pick up.
      await this.remote('disable provider', () => this.goclaw.updateProvider(providerId, { enabled: false }))
      aiError(422, 'AI_VERIFY_FAILED', `Không dùng được khoá/model này: ${detail}`)
    }
    await this.repository.setProviderStatus(userId, 'ready', { model, verified: true })
    await this.provisionAgent(userId, model)
    return this.setup(userId)
  }

  /** Creates the agent inactive, loads its files and tools, and only then switches it on. */
  private async provisionAgent(userId: string, model: string) {
    const definition = agentDefinition(userId, model)
    const key = agentKey(userId)
    const current = await this.remote('get agent', () => this.goclaw.getAgent(key))
    let agentId: string
    if (current) {
      agentId = current.id
      const { agent_key: _key, status: _status, ...patch } = definition
      await this.remote('update agent', () => this.goclaw.updateAgent(agentId, { ...patch, status: 'inactive' }))
    } else {
      agentId = await this.remote('create agent', () => this.goclaw.createAgent({ ...definition, status: 'inactive' }))
    }
    await this.repository.saveAgent({ userId, goclawAgentId: agentId, agentKey: key, promptVersion: 0, status: 'inactive' })
    await this.remote('write agent files', () => writeAgentFiles(key, agentFiles()))
    await this.repository.setPromptVersion(userId, PROMPT_VERSION)
    await this.connectTools(userId, agentId)
    await this.remote('activate agent', () => this.goclaw.updateAgent(agentId, { status: 'active' }))
    await this.repository.setAgentStatus(userId, 'active')
  }

  /** The MCP server is registered once by `npm run ai -- register-mcp`; without it the agent just has no `cn_*` tools. */
  private async mcpServerId() {
    if (this.mcpServer && Date.now() - this.mcpServer.at < 300_000) return this.mcpServer.id
    const name = configuration().mcp.serverName
    const server = (await this.goclaw.listMcpServers()).find((entry) => entry.name === name)
    this.mcpServer = server?.id ? { id: server.id, at: Date.now() } : null
    return this.mcpServer?.id ?? null
  }

  private async connectTools(userId: string, agentId: string) {
    const serverId = await this.remote('find mcp server', () => this.mcpServerId())
    if (!serverId) { this.logger.warn('MCP server is not registered; agent created without cn_* tools'); return }
    const token = randomBytes(32).toString('base64url')
    await this.repository.issueMcpToken(userId, token)
    await this.remote('grant mcp', () => this.goclaw.grantMcpToAgent(serverId, agentId))
    await this.remote('mcp credential', () => this.goclaw.setMcpCredential(serverId, goclawUserId(userId), { [MCP_TOKEN_HEADER]: token }))
  }

  /** Agent off in GoClaw first; the DB follows only once GoClaw has accepted it. */
  private async deactivateAgent(userId: string) {
    const agent = await this.repository.agent(userId)
    if (!agent?.goclawAgentId || agent.status === 'inactive') return
    const agentId = agent.goclawAgentId
    await this.remote('deactivate agent', () => this.goclaw.updateAgent(agentId, { status: 'inactive' }))
    await this.repository.setAgentStatus(userId, 'inactive')
  }

  /** Removes the key from GoClaw. The agent stays (inactive) so history and memory survive a new key. */
  async removeProvider(userId: string) {
    this.requireGoclaw()
    const provider = await this.repository.provider(userId)
    if (!provider) return this.setup(userId)
    this.refuseIfDisabled(provider)
    await this.deactivateAgent(userId)
    const providerId = provider.goclawProviderId
    if (providerId) await this.remote('delete provider', () => this.goclaw.deleteProvider(providerId))
    await this.dropMcpCredential(userId)
    await this.repository.removeProvider(userId)
    return this.setup(userId)
  }

  private async dropMcpCredential(userId: string) {
    await this.repository.revokeMcpTokens(userId)
    const serverId = await this.remote('find mcp server', () => this.mcpServerId())
    if (serverId) await this.remote('delete mcp credential', () => this.goclaw.deleteMcpCredential(serverId, goclawUserId(userId)))
  }

  /**
   * Mints a browser ticket. GoClaw is asked again each time: a provider deleted or disabled behind
   * our back would otherwise let the agent fall back onto someone else's key.
   */
  async session(userId: string) {
    this.requireGoclaw()
    const [provider, agent] = await Promise.all([this.repository.provider(userId), this.repository.agent(userId)])
    if (provider?.status === 'disabled') this.refuseIfDisabled(provider)
    if (!provider?.goclawProviderId || provider.status !== 'ready' || !agent?.goclawAgentId || agent.status !== 'active') {
      aiError(409, 'AI_NOT_READY', 'Trợ lý AI chưa sẵn sàng. Hãy thêm và kiểm tra khoá API trước.')
    }
    const providerId = provider.goclawProviderId
    const agentId = agent.goclawAgentId
    const [remoteProvider, remoteAgent] = await this.remote('check setup', () => Promise.all([this.goclaw.getProvider(providerId), this.goclaw.getAgent(agentId)]))
    const intact = remoteProvider?.enabled === true && remoteProvider.name === provider.goclawName
      && remoteAgent?.status === 'active' && remoteAgent.provider === provider.goclawName
    if (!intact) {
      this.logger.warn(`AI setup drifted for ${userId}; agent switched off`)
      if (remoteAgent) await this.remote('deactivate drifted agent', () => this.goclaw.updateAgent(agentId, { status: 'inactive' }))
      await this.repository.setAgentStatus(userId, 'inactive')
      await this.repository.setProviderStatus(userId, 'failed', { lastError: 'Cấu hình trên máy chủ AI đã thay đổi. Hãy kiểm tra lại khoá.' })
      aiError(409, 'AI_NOT_READY', 'Cấu hình trợ lý đã thay đổi. Hãy kiểm tra lại khoá API.')
    }
    const ticket = await this.remote('mint ticket', () => this.goclaw.mintTicket(goclawUserId(userId), agent.agentKey, configuration().ai.ticketTtlSeconds))
    // GoClaw builds ws_url from the Host of OUR request, which the browser cannot reach.
    const wsUrl = configuration().goclaw.publicWsUrl || ticket.wsUrl
    return { ok: true, token: ticket.token, wsUrl, userId: ticket.userId, agentKey: agent.agentKey, expiresAt: ticket.expiresAt }
  }

  /** Staff switch: blocks the user's AI until staff enable it again; the user cannot undo it by re-verifying. */
  async disableByStaff(userId: string) {
    this.requireGoclaw()
    const provider = await this.repository.provider(userId)
    if (!provider) aiError(404, 'NOT_FOUND', 'Tài khoản này chưa cài AI.')
    await this.deactivateAgent(userId)
    const providerId = provider.goclawProviderId
    if (providerId) await this.remote('disable provider', () => this.goclaw.updateProvider(providerId, { enabled: false }))
    await this.repository.revokeMcpTokens(userId)
    await this.repository.setProviderStatus(userId, 'disabled', { lastError: null })
  }

  /** Lifts a staff block; the user still has to verify the key again before the agent runs. */
  async enableByStaff(userId: string) {
    const provider = await this.repository.provider(userId)
    if (!provider) aiError(404, 'NOT_FOUND', 'Tài khoản này chưa cài AI.')
    if (provider.status !== 'disabled') return
    await this.repository.setProviderStatus(userId, 'failed', { lastError: 'Đã được mở lại. Hãy kiểm tra lại khoá API.' })
  }

  /** Account deletion. Order matters: agent off, provider gone, agent gone, then our rows. */
  async removeEverything(userId: string) {
    const [provider, agent] = await Promise.all([this.repository.provider(userId), this.repository.agent(userId)])
    if (!provider && !agent) return
    this.requireGoclaw()
    await this.deactivateAgent(userId)
    const providerId = provider?.goclawProviderId
    if (providerId) await this.goclaw.deleteProvider(providerId)
    const agentId = agent?.goclawAgentId
    if (agentId) await this.goclaw.deleteAgent(agentId)
    await this.dropMcpCredential(userId)
    await this.repository.removeAll(userId)
  }

  /** Pushes the current backend/agent/ files to agents still on an older PROMPT_VERSION. */
  async syncAgents() {
    this.requireGoclaw()
    const stale = await this.repository.agentsBelowPrompt(PROMPT_VERSION)
    const files = agentFiles()
    const failed: string[] = []
    for (const agent of stale) {
      try {
        await writeAgentFiles(agent.agentKey, files)
        await this.repository.setPromptVersion(agent.userId, PROMPT_VERSION)
      } catch (error) {
        failed.push(`${agent.agentKey}: ${error instanceof GoclawError ? error.message : String(error)}`)
      }
    }
    return { updated: stale.length - failed.length, failed }
  }
}
