import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'

export type ProviderStatus = 'verifying' | 'ready' | 'failed' | 'disabled'
export type AgentStatus = 'active' | 'inactive'

export interface ProviderRow {
  userId: string; goclawProviderId: string | null; goclawName: string; type: string; apiBase: string; model: string | null
  status: ProviderStatus; lastError: string | null; verifiedAt: number | null; updatedAt: number
}
export interface AgentRow { userId: string; goclawAgentId: string | null; agentKey: string; promptVersion: number; status: AgentStatus; updatedAt: number }

export const mcpTokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const now = () => Math.floor(Date.now() / 1000)
// A check left open longer than this is unlikely to be what a new draft belongs to.
const SOURCE_CHECK_LINK_SECONDS = 6 * 3600

function toProvider(row: RowDataPacket): ProviderRow {
  return {
    userId: row.user_id, goclawProviderId: row.goclaw_provider_id ?? null, goclawName: row.goclaw_name, type: row.provider_type, apiBase: row.api_base,
    model: row.model ?? null, status: row.status, lastError: row.last_error ?? null, verifiedAt: row.verified_at === null ? null : Number(row.verified_at), updatedAt: Number(row.updated_at),
  }
}
function toAgent(row: RowDataPacket): AgentRow {
  return { userId: row.user_id, goclawAgentId: row.goclaw_agent_id ?? null, agentKey: row.agent_key, promptVersion: Number(row.prompt_version), status: row.status, updatedAt: Number(row.updated_at) }
}

@Injectable()
export class AiRepository {
  constructor(private readonly database: DatabaseService) {}

  async provider(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM ai_providers WHERE user_id = ?', [userId])
    return rows.length ? toProvider(rows[0]) : null
  }

  async agent(userId: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM ai_agents WHERE user_id = ?', [userId])
    return rows.length ? toAgent(rows[0]) : null
  }

  async saveProvider(input: { userId: string; goclawProviderId: string; goclawName: string; type: string; apiBase: string; status: ProviderStatus }) {
    const at = now()
    await this.database.pool.execute(
      `INSERT INTO ai_providers (user_id, goclaw_provider_id, goclaw_name, provider_type, api_base, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE goclaw_provider_id = VALUES(goclaw_provider_id), provider_type = VALUES(provider_type), api_base = VALUES(api_base),
         status = VALUES(status), last_error = NULL, updated_at = VALUES(updated_at)`,
      [input.userId, input.goclawProviderId, input.goclawName, input.type, input.apiBase, input.status, at, at])
  }

  async setProviderStatus(userId: string, status: ProviderStatus, extra: { model?: string; lastError?: string | null; verified?: boolean } = {}) {
    const at = now()
    await this.database.pool.execute(
      `UPDATE ai_providers SET status = ?, model = COALESCE(?, model), last_error = ?, verified_at = IF(?, ?, verified_at), updated_at = ? WHERE user_id = ?`,
      [status, extra.model ?? null, extra.lastError ?? null, extra.verified ? 1 : 0, at, at, userId])
  }

  async saveAgent(input: { userId: string; goclawAgentId: string; agentKey: string; promptVersion: number; status: AgentStatus }) {
    const at = now()
    await this.database.pool.execute(
      `INSERT INTO ai_agents (user_id, goclaw_agent_id, agent_key, prompt_version, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE goclaw_agent_id = VALUES(goclaw_agent_id), prompt_version = VALUES(prompt_version), status = VALUES(status), updated_at = VALUES(updated_at)`,
      [input.userId, input.goclawAgentId, input.agentKey, input.promptVersion, input.status, at, at])
  }

  async setAgentStatus(userId: string, status: AgentStatus) {
    await this.database.pool.execute('UPDATE ai_agents SET status = ?, updated_at = ? WHERE user_id = ?', [status, now(), userId])
  }

  async setPromptVersion(userId: string, version: number) {
    await this.database.pool.execute('UPDATE ai_agents SET prompt_version = ?, updated_at = ? WHERE user_id = ?', [version, now(), userId])
  }

  async agentsBelowPrompt(version: number) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>('SELECT * FROM ai_agents WHERE prompt_version < ? AND goclaw_agent_id IS NOT NULL', [version])
    return rows.map(toAgent)
  }

  async removeProvider(userId: string) { await this.database.pool.execute('DELETE FROM ai_providers WHERE user_id = ?', [userId]) }

  async removeAll(userId: string) {
    for (const table of ['ai_agents', 'ai_providers', 'mcp_tokens']) await this.database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [userId])
  }

  /** One live MCP token per person: issuing a new one revokes the rest. */
  async issueMcpToken(userId: string, token: string) {
    const at = now()
    await this.database.pool.execute('UPDATE mcp_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [at, userId])
    await this.database.pool.execute('INSERT INTO mcp_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)', [mcpTokenHash(token), userId, at])
  }

  async revokeMcpTokens(userId: string) {
    await this.database.pool.execute('UPDATE mcp_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now(), userId])
  }

  /** Resolves only active accounts, so disabling a user also cuts their agent off from our tools. */
  async userForMcpToken(token: string) {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(
      `SELECT t.user_id FROM mcp_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.revoked_at IS NULL AND u.status = 'active'`, [mcpTokenHash(token)])
    return rows.length ? (rows[0].user_id as string) : null
  }

  async recordSourceCheck(input: { id: string; userId: string; toolId: string; baseSnapshotId: string | null; sessionKey: string }) {
    await this.database.pool.execute('INSERT INTO ai_source_checks (id, user_id, tool_id, base_snapshot_id, session_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [input.id, input.userId, input.toolId, input.baseSnapshotId, input.sessionKey, now()])
  }

  /** Newest first, paged by `(created_at, id)` so checks started in the same second are neither skipped nor repeated. */
  async sourceCheckHistory(userId: string, before: { createdAt: number; id: string } | null, limit: number) {
    const cursor = before ? ' AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))' : ''
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT c.id, c.tool_id, c.base_snapshot_id, c.draft_id, c.created_at, d.id AS draft_row, d.submitted_contribution_id, k.status AS contribution_status
       FROM ai_source_checks c
       LEFT JOIN contribution_drafts d ON d.id = c.draft_id AND d.user_id = c.user_id
       LEFT JOIN contributions k ON k.id = d.submitted_contribution_id
       WHERE c.user_id = ?${cursor} ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
      before ? [userId, before.createdAt, before.createdAt, before.id, limit] : [userId, limit],
    )
    return rows.map((row) => ({
      id: row.id as string, toolId: row.tool_id as string, baseSnapshotId: (row.base_snapshot_id ?? null) as string | null, createdAt: Number(row.created_at),
      // A sent draft keeps its row; a discarded one is deleted, which is how "discarded" is told apart from "no draft".
      draft: !row.draft_id ? 'none' as const : !row.draft_row ? 'discarded' as const : row.submitted_contribution_id ? 'submitted' as const : 'open' as const,
      contributionId: (row.submitted_contribution_id ?? null) as string | null,
      contributionStatus: (row.contribution_status ?? null) as string | null,
    }))
  }

  /** MCP calls do not say which chat they came from; the person's latest check of that tool is the best match. */
  async linkSourceCheck(userId: string, toolId: string, draftId: string) {
    await this.database.pool.execute('UPDATE ai_source_checks SET draft_id = ? WHERE user_id = ? AND tool_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1',
      [draftId, userId, toolId, now() - SOURCE_CHECK_LINK_SECONDS])
  }

  /** Admin listing: everyone who ever saved a provider, newest change first. */
  async list(input: { q?: string; status?: ProviderStatus; page: number; pageSize: number }) {
    const where: string[] = []
    const params: (string | number)[] = []
    if (input.q) { where.push('u.email LIKE ?'); params.push(`%${input.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`) }
    if (input.status) { where.push('p.status = ?'); params.push(input.status) }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [[count]] = await this.database.pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ai_providers p JOIN users u ON u.id = p.user_id ${clause}`, params)
    const [rows] = await this.database.pool.query<RowDataPacket[]>(
      `SELECT p.*, u.email, a.status AS agent_status, a.agent_key, a.prompt_version FROM ai_providers p JOIN users u ON u.id = p.user_id
       LEFT JOIN ai_agents a ON a.user_id = p.user_id ${clause} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
      [...params, input.pageSize, (input.page - 1) * input.pageSize])
    return {
      total: Number(count.total),
      items: rows.map((row) => ({ ...toProvider(row), email: row.email as string, agentStatus: (row.agent_status ?? null) as AgentStatus | null, agentKey: (row.agent_key ?? null) as string | null, promptVersion: row.prompt_version === null ? null : Number(row.prompt_version) })),
    }
  }
}
