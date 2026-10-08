import { configuration } from '../config/configuration'
import { GoclawClient, GoclawError } from './goclaw.client'

/** Creates or re-points the shared `chuyen-nho` MCP server in GoClaw. Never touches `background.provider`. */
export async function registerMcpServer(goclaw: GoclawClient) {
  const { publicUrl: url, serverName } = configuration().mcp
  if (!/^https?:\/\/.+\/mcp\/sse$/.test(url)) throw new GoclawError('MCP_PUBLIC_URL must be the full address GoClaw calls, ending in /api/v1/mcp/sse', 400)
  const existing = (await goclaw.listMcpServers()).find((server) => server.name === serverName)
  if (existing?.id) {
    await goclaw.updateMcpServer(existing.id, { url, transport: 'sse', enabled: true, settings: { require_user_credentials: true } })
    return { action: 'updated' as const, id: existing.id, url, serverName }
  }
  const id = await goclaw.createMcpServer({ name: serverName, displayName: 'Chuyện Nhỏ', url })
  return { action: 'created' as const, id, url, serverName }
}
