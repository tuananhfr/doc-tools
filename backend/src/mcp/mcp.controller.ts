import { Body, Controller, Get, HttpCode, HttpException, Logger, Post, Query, Req, Res } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import { AiRepository } from '../ai/ai.repository'
import { configuration } from '../config/configuration'
import { MCP_TOOLS } from './mcp-tools'
import { McpToolsService } from './mcp-tools.service'

interface McpSession { userId: string; token: string; raw: ServerResponse; keepalive: ReturnType<typeof setInterval>; openedAt: number }
interface RpcMessage { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const MAX_SESSIONS_PER_USER = 4

function tokenOf(request: FastifyRequest) {
  const value = request.headers['x-cn-mcp-token']
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null
}

const deny = (status: number, code: string) => new HttpException({ ok: false, code }, status)

/**
 * MCP over the SSE transport, written by hand because it is small: GET opens the stream and names the
 * POST endpoint; every JSON-RPC reply travels back over that stream. GoClaw sends the per-user token
 * (`X-CN-MCP-Token`, set as the user's MCP credential) when it opens the stream. A revoked token
 * closes the stream, and GoClaw reconnects with whatever credential it holds now.
 */
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger('McpController')
  private readonly sessions = new Map<string, McpSession>()

  constructor(private readonly ai: AiRepository, private readonly tools: McpToolsService) {}

  private ipAllowed(request: FastifyRequest) {
    const allowed = configuration().mcp.allowedIps
    return !allowed.length || allowed.includes(request.ip)
  }

  private close(id: string) {
    const session = this.sessions.get(id)
    if (!session) return
    clearInterval(session.keepalive)
    this.sessions.delete(id)
    session.raw.end()
  }

  @Get('sse')
  async open(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!this.ipAllowed(request)) return reply.code(403).send({ ok: false, code: 'MCP_FORBIDDEN' })
    const token = tokenOf(request)
    const userId = token ? await this.ai.userForMcpToken(token) : null
    if (!token || !userId) return reply.code(401).send({ ok: false, code: 'MCP_UNAUTHORIZED' })

    const mine = [...this.sessions.entries()].filter(([, session]) => session.userId === userId).sort((a, b) => a[1].openedAt - b[1].openedAt)
    for (const [id] of mine.slice(0, Math.max(0, mine.length - MAX_SESSIONS_PER_USER + 1))) this.close(id)

    reply.hijack()
    const raw = reply.raw
    // nginx buffers proxied responses by default, which would hold every event back.
    raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' })
    const id = randomUUID()
    const keepalive = setInterval(() => raw.write(': ping\n\n'), 25000)
    this.sessions.set(id, { userId, token, raw, keepalive, openedAt: Date.now() })
    // Relative, so it resolves against MCP_PUBLIC_URL whatever path prefix nginx adds in front.
    raw.write(`event: endpoint\ndata: messages?sessionId=${id}\n\n`)
    request.raw.on('close', () => { clearInterval(keepalive); this.sessions.delete(id) })
  }

  @Post('messages')
  @HttpCode(202)
  @RouteConfig({ bodyLimit: 65536 })
  async message(@Query('sessionId') id: string, @Body() body: unknown, @Req() request: FastifyRequest) {
    const session = typeof id === 'string' ? this.sessions.get(id) : undefined
    if (!session) throw deny(404, 'MCP_SESSION_NOT_FOUND')
    const token = tokenOf(request)
    if (token && token !== session.token) throw deny(403, 'MCP_FORBIDDEN')
    if (await this.ai.userForMcpToken(session.token) !== session.userId) {
      this.close(id)
      throw deny(401, 'MCP_UNAUTHORIZED')
    }
    const messages = (Array.isArray(body) ? body : [body]).filter((item): item is RpcMessage => Boolean(item) && typeof item === 'object')
    if (!messages.length) throw deny(400, 'MCP_BAD_REQUEST')
    for (const message of messages) {
      const reply = await this.handle(message, session.userId)
      if (reply) session.raw.write(`event: message\ndata: ${JSON.stringify(reply)}\n\n`)
    }
    return 'Accepted'
  }

  private async handle(message: RpcMessage, userId: string) {
    // Notifications carry no id and get no answer.
    if (message.id === undefined || message.id === null) return null
    const result = (value: unknown) => ({ jsonrpc: '2.0', id: message.id, result: value })
    const error = (code: number, text: string) => ({ jsonrpc: '2.0', id: message.id, error: { code, message: text } })
    switch (message.method) {
      case 'initialize': {
        const asked = String(message.params?.protocolVersion ?? '')
        return result({
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'chuyen-nho', version: '1.0.0' },
        })
      }
      case 'ping': return result({})
      case 'tools/list': return result({ tools: MCP_TOOLS })
      case 'tools/call': {
        const name = String(message.params?.name ?? '')
        const args = message.params?.arguments
        try { return result(await this.tools.call(name, args && typeof args === 'object' && !Array.isArray(args) ? args as Record<string, unknown> : {}, userId)) }
        catch (failure) {
          this.logger.warn(`tool ${name} failed: ${failure instanceof Error ? failure.message : String(failure)}`)
          return result({ content: [{ type: 'text', text: 'Công cụ gặp lỗi, hãy thử lại.' }], isError: true })
        }
      }
      default: return error(-32601, `Method not found: ${String(message.method)}`)
    }
  }
}
