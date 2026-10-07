import { Injectable } from '@nestjs/common'
import { configuration } from '../config/configuration'

export class GoclawError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'GoclawError'
  }
}

export interface GoclawTicket { token: string; wsUrl: string; userId: string; expiresAt: number }
export interface GoclawAgent { id: string; agent_key: string; provider: string; model: string; status: string }

/** GoClaw answers with three error shapes depending on the handler. */
function errorMessage(body: unknown, status: number) {
  const value = body as { error?: unknown; message?: unknown } | null
  if (typeof value?.error === 'string') return value.error
  const nested = value?.error as { message?: unknown } | undefined
  if (typeof nested?.message === 'string') return nested.message
  if (typeof value?.message === 'string') return value.message
  return `GoClaw HTTP ${status}`
}

/**
 * Admin access to GoClaw. Only this backend holds the gateway token; browsers get tickets.
 * `X-GoClaw-User-Id: system` makes the gateway token act as tenant owner (agent create needs it).
 */
@Injectable()
export class GoclawClient {
  configured() {
    const { url, gatewayToken } = configuration().goclaw
    return Boolean(url && gatewayToken)
  }

  private async request<T>(method: string, path: string, body?: unknown, timeoutMs = 20000): Promise<T> {
    const { url, gatewayToken } = configuration().goclaw
    if (!url || !gatewayToken) throw new GoclawError('GoClaw is not configured', 503)
    let response: Response
    try {
      response = await fetch(`${url.replace(/\/+$/, '')}${path}`, {
        method,
        headers: { authorization: `Bearer ${gatewayToken}`, 'x-goclaw-user-id': 'system', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new GoclawError(`GoClaw unreachable: ${error instanceof Error ? error.message : String(error)}`, 503)
    }
    const text = await response.text()
    let parsed: unknown = null
    try { parsed = text ? JSON.parse(text) : null } catch { parsed = null }
    if (!response.ok) throw new GoclawError(errorMessage(parsed, response.status), response.status)
    return parsed as T
  }

  private async orNull<T>(work: Promise<T>): Promise<T | null> {
    try { return await work } catch (error) {
      if (error instanceof GoclawError && error.status === 404) return null
      throw error
    }
  }

  /** Create is an upsert on (tenant, name): an existing name is overwritten and keeps its id. */
  async createProvider(input: { name: string; displayName: string; type: string; apiBase: string; apiKey: string; enabled: boolean }) {
    const created = await this.request<{ id: string }>('POST', '/v1/providers', {
      name: input.name, display_name: input.displayName, provider_type: input.type, api_base: input.apiBase, api_key: input.apiKey, enabled: input.enabled,
    })
    return created.id
  }

  /** An empty `apiKey` is ignored by GoClaw, so it cannot be used to clear a key. */
  updateProvider(id: string, patch: { enabled?: boolean; api_key?: string; api_base?: string; provider_type?: string; display_name?: string }) {
    return this.request('PUT', `/v1/providers/${encodeURIComponent(id)}`, patch)
  }

  async deleteProvider(id: string) { await this.orNull(this.request('DELETE', `/v1/providers/${encodeURIComponent(id)}`)) }

  getProvider(id: string) { return this.orNull(this.request<{ id: string; name: string; enabled: boolean }>('GET', `/v1/providers/${encodeURIComponent(id)}`)) }

  /** An upstream failure comes back as an empty list, not an error. */
  async listModels(id: string) {
    const result = await this.request<{ models?: { id?: unknown }[] }>('GET', `/v1/providers/${encodeURIComponent(id)}/models`, undefined, 30000)
    return (result?.models ?? []).map((model) => String(model?.id ?? '')).filter(Boolean)
  }

  /** Sends one tiny chat ("hi") with the user's key, so it costs them a few tokens. */
  async verifyProvider(id: string, model: string) {
    const result = await this.request<{ valid?: boolean; error?: string }>('POST', `/v1/providers/${encodeURIComponent(id)}/verify`, { model }, 45000)
    return { valid: result?.valid === true, error: result?.error ?? null }
  }

  /** GET accepts the agent key or UUID; every write needs the UUID. */
  getAgent(keyOrId: string) { return this.orNull(this.request<GoclawAgent>('GET', `/v1/agents/${encodeURIComponent(keyOrId)}`)) }

  async createAgent(data: Record<string, unknown>) { return (await this.request<{ id: string }>('POST', '/v1/agents', data)).id }

  /** Also flushes GoClaw's agent cache, which otherwise keeps the old provider object for up to 10 minutes. */
  updateAgent(id: string, patch: Record<string, unknown>) { return this.request('PUT', `/v1/agents/${encodeURIComponent(id)}`, patch) }

  async deleteAgent(id: string) { await this.orNull(this.request('DELETE', `/v1/agents/${encodeURIComponent(id)}`)) }

  async mintTicket(userId: string, agentKey: string, ttlSeconds: number): Promise<GoclawTicket> {
    const result = await this.request<{ token?: string; ws_url?: string; user_id?: string; expires_at?: number }>('POST', '/v1/agent-sessions', { user_id: userId, agent_key: agentKey, ttl_seconds: ttlSeconds })
    if (!result?.token) throw new GoclawError('GoClaw returned no ticket', 502)
    return { token: result.token, wsUrl: result.ws_url ?? '', userId: result.user_id ?? userId, expiresAt: Number(result.expires_at ?? 0) }
  }

  async listMcpServers() {
    const result = await this.request<unknown>('GET', '/v1/mcp/servers')
    const list = Array.isArray(result) ? result : (result as { servers?: unknown[] } | null)?.servers ?? []
    return (list as { id?: string; name?: string; url?: string; enabled?: boolean }[]).filter((server) => server?.id && server.name)
  }

  async createMcpServer(input: { name: string; displayName: string; url: string }) {
    const created = await this.request<{ id: string }>('POST', '/v1/mcp/servers', {
      name: input.name, display_name: input.displayName, transport: 'sse', url: input.url, timeout_sec: 60,
      settings: { require_user_credentials: true }, enabled: true,
    })
    return created.id
  }

  updateMcpServer(id: string, patch: Record<string, unknown>) { return this.request('PUT', `/v1/mcp/servers/${encodeURIComponent(id)}`, patch) }

  grantMcpToAgent(serverId: string, agentId: string) {
    return this.request('POST', `/v1/mcp/servers/${encodeURIComponent(serverId)}/grants/agent`, { agent_id: agentId })
  }

  /** Does not drop a connection GoClaw already holds; that one idles out after about 15 minutes. */
  setMcpCredential(serverId: string, userId: string, headers: Record<string, string>) {
    return this.request('PUT', `/v1/mcp/servers/${encodeURIComponent(serverId)}/user-credentials?user_id=${encodeURIComponent(userId)}`, { headers })
  }

  async deleteMcpCredential(serverId: string, userId: string) {
    await this.orNull(this.request('DELETE', `/v1/mcp/servers/${encodeURIComponent(serverId)}/user-credentials?user_id=${encodeURIComponent(userId)}`))
  }

  async systemConfig(key: string) {
    const result = await this.orNull(this.request<{ value?: unknown }>('GET', `/v1/system-configs/${encodeURIComponent(key)}`))
    return result?.value === undefined || result.value === null ? null : String(result.value)
  }
}
