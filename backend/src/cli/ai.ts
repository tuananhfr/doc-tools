import 'dotenv/config'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { PlansRepository } from '../accounts/plans.repository'
import { PROMPT_VERSION } from '../ai/agent-profile'
import { AiReconcileService } from '../ai/ai-reconcile.service'
import { AiRepository } from '../ai/ai.repository'
import { AiService } from '../ai/ai.service'
import { GoclawClient } from '../ai/goclaw.client'
import { configuration } from '../config/configuration'
import { DatabaseService } from '../database/database.service'

const USAGE = 'Usage: ai <status | register-mcp | sync-agents | reconcile>'

/**
 * `register-mcp` creates or re-points the shared `chuyen-nho` MCP server in GoClaw. It never touches
 * `background.provider`; `status` only reports it (see docs/pro/pro-spec.md §6.2).
 */
async function main() {
  const [action] = process.argv.slice(2)
  if (!['status', 'register-mcp', 'sync-agents', 'reconcile'].includes(action)) throw new Error(USAGE)
  const goclaw = new GoclawClient()
  if (!goclaw.configured()) throw new Error('GOCLAW_URL and GOCLAW_GATEWAY_TOKEN must be set in .env')
  const config = configuration()

  if (action === 'register-mcp') {
    const url = config.mcp.publicUrl
    if (!/^https?:\/\/.+\/mcp\/sse$/.test(url)) throw new Error('MCP_PUBLIC_URL must be the full address GoClaw calls, ending in /api/v1/mcp/sse')
    const existing = (await goclaw.listMcpServers()).find((server) => server.name === config.mcp.serverName)
    if (existing?.id) {
      await goclaw.updateMcpServer(existing.id, { url, transport: 'sse', enabled: true, settings: { require_user_credentials: true } })
      process.stdout.write(`updated ${config.mcp.serverName} (${existing.id}) -> ${url}\n`)
    } else {
      const id = await goclaw.createMcpServer({ name: config.mcp.serverName, displayName: 'Chuyện Nhỏ', url })
      process.stdout.write(`created ${config.mcp.serverName} (${id}) -> ${url}\n`)
    }
    process.stdout.write('Agents created before this need their key verified again to receive the tools.\n')
    return
  }

  if (action === 'status') {
    const [servers, background] = await Promise.all([goclaw.listMcpServers(), goclaw.systemConfig('background.provider')])
    const server = servers.find((entry) => entry.name === config.mcp.serverName)
    process.stdout.write(`${JSON.stringify({
      goclaw: config.goclaw.url, publicWsUrl: config.goclaw.publicWsUrl || null, promptVersion: PROMPT_VERSION,
      mcp: server ? { id: server.id, url: server.url, enabled: server.enabled } : null,
      // Unset means GoClaw's background jobs pick any provider of the tenant, possibly a customer's key.
      backgroundProvider: background,
    }, null, 2)}\n`)
    return
  }

  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    const repository = new AiRepository(database)
    const service = new AiService(repository, goclaw, new AccountDeletionService(database))
    if (action === 'reconcile') {
      const summary = await new AiReconcileService(repository, goclaw, service, new PlansRepository(database)).reconcileAll()
      process.stdout.write(`${JSON.stringify(summary)}
`)
      if (summary?.errors) process.exitCode = 1
      return
    }
    const result = await service.syncAgents()
    process.stdout.write(`updated ${result.updated} agent(s) to prompt v${PROMPT_VERSION}\n`)
    for (const line of result.failed) process.stdout.write(`failed ${line}\n`)
    if (result.failed.length) process.exitCode = 1
  } finally { await database.onModuleDestroy() }
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
