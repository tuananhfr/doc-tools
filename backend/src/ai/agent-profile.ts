import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Bump when anything under backend/agent/ changes; `npm run ai -- sync-agents` pushes it to older agents. */
export const PROMPT_VERSION = 2

export const AGENT_FILE_NAMES = ['AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'CAPABILITIES.md'] as const

/** Read on demand so the CLI and the server pick up the same files; resolved from dist/ai/. */
export function agentFiles() {
  return AGENT_FILE_NAMES.map((name) => ({ name, content: readFileSync(join(__dirname, '..', '..', 'agent', name), 'utf8') }))
}

/**
 * A per-agent `allow` list intersects with everything else, so it is a real allowlist; MCP tools of
 * granted servers are added back by GoClaw afterwards. The deny list repeats the dangerous ones in case
 * a later GoClaw version widens a group: `exec`/`browser` run things on GoClaw's host, `create_*`/`tts`
 * bill the tenant's provider chain instead of the user's key.
 */
export const TOOLS_CONFIG = {
  allow: ['web_search', 'web_fetch', 'read_document', 'read_image', 'read_audio', 'memory_search', 'memory_get', 'datetime', 'write_file', 'send_file'],
  deny: ['exec', 'browser', 'spawn', 'delegate', 'cron', 'create_image', 'create_video', 'create_audio', 'tts', 'vault_search', 'vault_read',
    'team_tasks', 'message', 'sessions_send', 'skill_manage', 'publish_skill', 'facebook_post_with_comments', 'heartbeat'],
}

/** GoClaw ids are permanent keys for sessions, memory and USER.md, so they derive only from our user id. */
export const goclawUserId = (userId: string) => `cn-${userId}`
export const providerName = (userId: string) => `cn-${userId}`
export const agentKey = (userId: string) => `cn-${userId}`

/**
 * No `agent_description`: a predefined agent with one starts "summoning", an LLM call on the user's
 * key that writes its own persona files before the user has asked anything.
 */
export function agentDefinition(userId: string, model: string) {
  return {
    agent_key: agentKey(userId), display_name: 'Trợ lý Chuyện Nhỏ', provider: providerName(userId), model,
    agent_type: 'predefined', status: 'active', self_evolve: false, skill_evolve: false, tools_config: TOOLS_CONFIG,
    workspace_sharing: { shared_dm: false, shared_group: false, shared_users: [], share_memory: false, share_knowledge_graph: false, share_sessions: false },
  }
}
