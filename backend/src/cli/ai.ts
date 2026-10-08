import 'dotenv/config'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { PlansRepository } from '../accounts/plans.repository'
import { PROMPT_VERSION } from '../ai/agent-profile'
import { AiReconcileService } from '../ai/ai-reconcile.service'
import { AiRepository } from '../ai/ai.repository'
import { AiService } from '../ai/ai.service'
import { GoclawClient } from '../ai/goclaw.client'
import { registerMcpServer } from '../ai/mcp-registration'
import { configuration } from '../config/configuration'
import { applyRuntimeOverrides } from '../config/runtime-config'
import { DatabaseService } from '../database/database.service'
import { IntegrationRepository } from '../settings/integration.repository'

const USAGE = 'Usage: ai <status | register-mcp | sync-agents | reconcile>'

/**
 * `register-mcp` creates or re-points the shared `chuyen-nho` MCP server in GoClaw. It never touches
 * `background.provider`; `status` only reports it (see docs/pro/pro-spec.md §6.2).
 */
async function main() {
  const [action] = process.argv.slice(2)
  if (!['status', 'register-mcp', 'sync-agents', 'reconcile'].includes(action)) throw new Error(USAGE)
  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    // The same settings the running server uses: an owner may have set GoClaw in the admin area.
    applyRuntimeOverrides((await new IntegrationRepository(database).snapshot()).overrides)
    await run(action, database)
  } finally { await database.onModuleDestroy() }
}

async function run(action: string, database: DatabaseService) {
  const goclaw = new GoclawClient()
  if (!goclaw.configured()) throw new Error('GoClaw is not configured: set it in the admin area (AI accounts) or GOCLAW_URL and GOCLAW_GATEWAY_TOKEN in .env')
  const config = configuration()

  if (action === 'register-mcp') {
    const result = await registerMcpServer(goclaw)
    process.stdout.write(`${result.action} ${result.serverName} (${result.id}) -> ${result.url}\n`)
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
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
