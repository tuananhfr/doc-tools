const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { createHash, randomBytes, randomUUID } = require('node:crypto')

// A fake GoClaw (HTTP admin API + the WS method agents.files.set). Must exist before configuration() is read.
const fake = { calls: [], providers: new Map(), agents: new Map(), files: [], grants: [], credentials: new Map(), tickets: [], mcp: [] }
const GATEWAY = `gw-${randomBytes(8).toString('hex')}`
const server = http.createServer((request, response) => {
  let raw = ''
  request.on('data', (chunk) => { raw += chunk })
  request.on('end', () => {
    const url = new URL(request.url, 'http://fake')
    const body = raw ? JSON.parse(raw) : undefined
    fake.calls.push({ method: request.method, path: url.pathname, body })
    const send = (status, value) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)) }
    if (request.headers.authorization !== `Bearer ${GATEWAY}`) return send(401, { error: 'unauthorized' })
    if (request.headers['x-goclaw-user-id'] !== 'system') return send(400, { error: 'X-GoClaw-User-Id header is required' })
    const parts = url.pathname.split('/').filter(Boolean)
    if (request.method === 'POST' && url.pathname === '/v1/providers') {
      const existing = [...fake.providers.values()].find((provider) => provider.name === body.name)
      const id = existing?.id ?? randomUUID()
      fake.providers.set(id, { ...body, id })
      return send(201, { ...body, id, api_key: '***' })
    }
    if (parts[1] === 'providers' && parts[2]) {
      const provider = fake.providers.get(parts[2])
      if (!provider) return send(404, { error: 'not found' })
      if (request.method === 'GET' && parts[3] === 'models') return send(200, { models: [{ id: 'gpt-test' }, { id: 'bad-model' }] })
      if (request.method === 'POST' && parts[3] === 'verify') {
        if (!provider.enabled) return send(200, { valid: false, error: 'provider not registered: ' + provider.name })
        return send(200, body.model === 'bad-model' ? { valid: false, error: 'model not found' } : { valid: true })
      }
      if (request.method === 'GET') return send(200, { ...provider, api_key: '***' })
      if (request.method === 'PUT') { Object.assign(provider, body); return send(200, { status: 'updated' }) }
      if (request.method === 'DELETE') { fake.providers.delete(parts[2]); return send(200, { status: 'deleted' }) }
    }
    if (request.method === 'POST' && url.pathname === '/v1/agents') {
      if ([...fake.agents.values()].some((agent) => agent.agent_key === body.agent_key)) return send(409, { error: { code: 'ALREADY_EXISTS', message: 'exists' } })
      const id = randomUUID()
      fake.agents.set(id, { ...body, id })
      return send(201, { ...body, id })
    }
    if (parts[1] === 'agents' && parts[2]) {
      const agent = fake.agents.get(parts[2]) ?? (request.method === 'GET' ? [...fake.agents.values()].find((entry) => entry.agent_key === parts[2]) : undefined)
      if (!agent) return send(request.method === 'GET' ? 404 : 400, { error: { code: 'NOT_FOUND', message: 'agent not found' } })
      if (request.method === 'GET') return send(200, agent)
      if (request.method === 'PUT') { Object.assign(agent, body); return send(200, { ok: 'true' }) }
      if (request.method === 'DELETE') { fake.agents.delete(agent.id); return send(200, { ok: 'true' }) }
    }
    if (request.method === 'POST' && url.pathname === '/v1/agent-sessions') {
      fake.tickets.push(body)
      return send(200, { ok: true, token: `goclaw_ephemeral_${randomBytes(8).toString('hex')}`, ws_url: 'ws://internal-host/ws', user_id: body.user_id, expires_at: Math.floor(Date.now() / 1000) + body.ttl_seconds })
    }
    if (request.method === 'GET' && url.pathname === '/v1/mcp/servers') return send(200, { servers: fake.mcp })
    if (parts[1] === 'mcp' && parts[3] && parts[4] === 'grants') { fake.grants.push({ server: parts[3], agent: body.agent_id }); return send(201, { status: 'granted' }) }
    if (parts[1] === 'mcp' && parts[4] === 'user-credentials') {
      const userId = url.searchParams.get('user_id')
      if (request.method === 'PUT') fake.credentials.set(userId, body.headers)
      else fake.credentials.delete(userId)
      return send(200, { status: 'updated' })
    }
    if (request.method === 'GET' && url.pathname === '/v1/system-configs/background.provider') return send(404, { error: 'not found' })
    send(404, { error: `unhandled ${request.method} ${url.pathname}` })
  })
})

// Just enough RFC 6455 for one admin client: unmask text frames in, plain text frames out.
server.on('upgrade', (request, socket) => {
  const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64')
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
  let authed = false
  let buffer = Buffer.alloc(0)
  const sendFrame = (value) => {
    const payload = Buffer.from(JSON.stringify(value))
    const header = payload.length < 126 ? Buffer.from([0x81, payload.length]) : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 255])
    socket.write(Buffer.concat([header, payload]))
  }
  socket.on('error', () => {})
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    for (;;) {
      if (buffer.length < 2) return
      const opcode = buffer[0] & 0x0f
      let length = buffer[1] & 0x7f
      let offset = 2
      if (length === 126) { length = buffer.readUInt16BE(2); offset = 4 } else if (length === 127) { length = Number(buffer.readBigUInt64BE(2)); offset = 10 }
      if (buffer.length < offset + 4 + length) return
      const mask = buffer.subarray(offset, offset + 4)
      const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length).map((byte, index) => byte ^ mask[index % 4]))
      buffer = buffer.subarray(offset + 4 + length)
      if (opcode === 8) { socket.end(); return }
      if (opcode !== 1) continue
      const frame = JSON.parse(payload.toString('utf8'))
      if (frame.method === 'connect') {
        authed = frame.params.token === GATEWAY && frame.params.user_id === 'system'
        sendFrame({ type: 'res', id: frame.id, ok: authed, ...(authed ? { payload: { role: 'owner' } } : { error: { code: 'UNAUTHORIZED', message: 'bad token' } }) })
      } else if (authed && frame.method === 'agents.files.set') {
        fake.files.push(frame.params)
        fake.calls.push({ method: 'WS', path: 'agents.files.set', body: { agentId: frame.params.agentId, name: frame.params.name } })
        sendFrame({ type: 'res', id: frame.id, ok: true, payload: { agentId: frame.params.agentId, file: { name: frame.params.name } } })
      } else {
        sendFrame({ type: 'res', id: frame.id, ok: false, error: { code: 'UNAUTHORIZED', message: 'not allowed' } })
      }
    }
  })
})

test('AI: provider, agent, guard rails, tickets, MCP tools, staff switch and deletion', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const fakeUrl = `http://127.0.0.1:${server.address().port}`
  process.env.SITE_ORIGINS = 'https://site.test'
  process.env.GOCLAW_URL = fakeUrl
  process.env.GOCLAW_GATEWAY_TOKEN = GATEWAY
  process.env.GOCLAW_PUBLIC_WS_URL = 'wss://ws.example.test/ws'
  process.env.MCP_PUBLIC_URL = 'https://site.test/api/v1/mcp/sse'
  process.env.MCP_ALLOWED_IPS = ''
  process.env.AI_DEV_ALLOW_PRIVATE_API_BASE = '0'
  require('reflect-metadata')
  require('dotenv/config')
  const { NestFactory } = require('@nestjs/core')
  const { AppModule } = require('../dist/app.module')
  const { createHttpAdapter } = require('../dist/config/http-adapter')
  const { DatabaseService } = require('../dist/database/database.service')
  const { AccountDeletionService } = require('../dist/accounts/account-deletion.service')

  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const tag = randomBytes(5).toString('hex')
  let database
  try {
    await app.init()
    await app.listen(0, '127.0.0.1')
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}`
    const api = app.getHttpAdapter().getInstance()
    database = app.get(DatabaseService)
    fake.mcp.push({ id: randomUUID(), name: 'chuyen-nho', url: process.env.MCP_PUBLIC_URL, enabled: true })

    async function person(name, { pro = false, role = null } = {}) {
      const id = randomUUID()
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-ai-${name}-${tag}@example.test`])
      if (pro) await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [id, now - 60, now + 86400])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const token = randomBytes(32).toString('base64url')
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const call = (user, method, url, payload, trusted = true) => api.inject({
      method, url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1',
      headers: { ...(user ? { cookie: user.cookie } : {}), ...(trusted ? { 'x-cn-request': '1', origin: 'https://site.test' } : {}) },
    })
    const callIndex = (predicate) => fake.calls.findIndex(predicate)

    const free = await person('free')
    const pro = await person('pro', { pro: true })
    const owner = await person('owner', { role: 'owner' })
    const goclawId = `cn-${pro.id}`

    // Who may do what.
    const types = (await call(null, 'GET', '/ai/provider-types')).json()
    assert.ok(types.items.some((item) => item.type === 'openrouter'))
    assert.ok(!types.items.some((item) => ['ollama', 'claude_cli', 'acp', 'chatgpt_oauth'].includes(item.type)))
    assert.equal((await call(null, 'GET', '/ai/setup')).json().code, 'SIGNED_OUT')
    assert.equal((await call(free, 'GET', '/ai/setup')).statusCode, 200, 'setup stays readable without Pro')
    assert.equal((await call(free, 'PUT', '/ai/provider', { type: 'openrouter', apiKey: 'sk-free-12345678' })).json().code, 'PRO_REQUIRED')
    assert.equal((await call(pro, 'PUT', '/ai/provider', { type: 'openrouter', apiKey: 'sk-test-12345678' }, false)).json().code, 'UNTRUSTED_REQUEST')
    assert.equal((await call(pro, 'PUT', '/ai/provider', { type: 'ollama', apiKey: 'sk-test-12345678' })).statusCode, 400)
    assert.equal((await call(pro, 'PUT', '/ai/provider', { type: 'openai_compat', apiKey: 'sk-test-12345678', apiBase: 'http://localhost:11434/v1' })).json().code, 'INVALID_API_BASE')
    assert.equal((await call(pro, 'PUT', '/ai/provider', { type: 'openai_compat', apiKey: 'sk-test-12345678', apiBase: 'https://10.0.0.8/v1' })).json().code, 'INVALID_API_BASE')
    assert.equal((await call(pro, 'PUT', '/ai/provider', { type: 'openrouter', apiKey: 'short' })).json().code, 'INVALID_INPUT')
    assert.equal(fake.providers.size, 0, 'nothing reached GoClaw yet')

    // Save the key: provider upserted under the user's own name, key never stored here.
    const KEY = `sk-secret-${tag}`
    const saved = (await call(pro, 'PUT', '/ai/provider', { type: 'openrouter', apiKey: KEY })).json()
    assert.equal(saved.ok, true)
    assert.deepEqual(saved.models, ['gpt-test', 'bad-model'])
    assert.equal(saved.provider.status, 'verifying')
    const [provider] = [...fake.providers.values()]
    assert.equal(provider.name, goclawId)
    assert.equal(provider.api_base, 'https://openrouter.ai/api/v1')
    assert.equal(provider.api_key, KEY)
    const [[row]] = await database.pool.execute('SELECT * FROM ai_providers WHERE user_id = ?', [pro.id])
    assert.ok(!JSON.stringify(row).includes(KEY), 'the API key never lands in our database')
    assert.equal((await call(pro, 'POST', '/ai/session')).json().code, 'AI_NOT_READY')

    // A failing model switches the provider off so GoClaw's fallback cannot pick it up.
    const failed = await call(pro, 'POST', '/ai/provider/verify', { model: 'bad-model' })
    assert.equal(failed.statusCode, 422)
    assert.equal(failed.json().code, 'AI_VERIFY_FAILED')
    assert.equal(provider.enabled, false)
    assert.equal(fake.agents.size, 0)

    // A working model: agent created inactive, files and tools loaded, then switched on.
    const verified = (await call(pro, 'POST', '/ai/provider/verify', { model: 'gpt-test' })).json()
    assert.equal(verified.provider.status, 'ready')
    assert.deepEqual(verified.agent, { status: 'active', upToDate: true })
    assert.equal(provider.enabled, true)
    const [agent] = [...fake.agents.values()]
    assert.equal(agent.agent_key, goclawId)
    assert.equal(agent.provider, goclawId)
    assert.equal(agent.model, 'gpt-test')
    assert.equal(agent.status, 'active')
    assert.equal(agent.agent_description, undefined, 'no description, so GoClaw does not run summoning on the user key')
    assert.ok(!agent.tools_config.allow.includes('exec') && agent.tools_config.deny.includes('exec'))
    assert.equal(fake.calls.find((entry) => entry.method === 'POST' && entry.path === '/v1/agents').body.status, 'inactive')
    assert.deepEqual(fake.files.map((file) => file.name).sort(), ['AGENTS.md', 'CAPABILITIES.md', 'IDENTITY.md', 'SOUL.md'])
    assert.ok(fake.files.every((file) => file.agentId === goclawId && file.content.length > 20))
    assert.deepEqual(fake.grants, [{ server: fake.mcp[0].id, agent: agent.id }])
    const firstMcpToken = fake.credentials.get(goclawId)['X-CN-MCP-Token']
    assert.match(firstMcpToken, /^[A-Za-z0-9_-]{43}$/)
    const filesAt = callIndex((entry) => entry.path === 'agents.files.set')
    const activeAt = callIndex((entry) => entry.method === 'PUT' && entry.path === `/v1/agents/${agent.id}` && entry.body.status === 'active')
    assert.ok(filesAt >= 0 && activeAt > filesAt, 'agent goes active only after its files are in place')

    // Ticket: minted for the cn- user, ws_url replaced with the public one.
    const ticket = (await call(pro, 'POST', '/ai/session')).json()
    assert.equal(ticket.ok, true)
    assert.equal(ticket.wsUrl, 'wss://ws.example.test/ws')
    assert.equal(ticket.agentKey, goclawId)
    assert.deepEqual(fake.tickets.at(-1), { user_id: goclawId, agent_key: goclawId, ttl_seconds: 900 })

    // Drift: provider switched off behind our back -> no ticket, agent switched off.
    provider.enabled = false
    assert.equal((await call(pro, 'POST', '/ai/session')).json().code, 'AI_NOT_READY')
    assert.equal(agent.status, 'inactive')
    assert.equal((await call(pro, 'POST', '/ai/provider/verify', { model: 'gpt-test' })).json().provider.status, 'ready')
    assert.equal(agent.status, 'active')
    assert.equal((await call(pro, 'POST', '/ai/session')).json().ok, true)

    // MCP over real SSE.
    const sse = (token) => new Promise((resolve, reject) => {
      const request = http.get(`${base}/api/v1/mcp/sse`, { headers: token ? { 'x-cn-mcp-token': token } : {} }, (response) => {
        if (response.statusCode !== 200) { response.resume(); return resolve({ status: response.statusCode }) }
        const stream = { status: 200, events: [], waiters: [], close: () => request.destroy() }
        let pending = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          pending += chunk
          let cut
          while ((cut = pending.indexOf('\n\n')) >= 0) {
            const block = pending.slice(0, cut)
            pending = pending.slice(cut + 2)
            const event = block.match(/^event: (.*)$/m)?.[1]
            const data = block.match(/^data: (.*)$/m)?.[1]
            if (!event) continue
            stream.events.push({ event, data })
            for (const waiter of stream.waiters.splice(0)) waiter()
          }
        })
        resolve(stream)
      })
      request.on('error', (error) => { if (error.code !== 'ECONNRESET') reject(error) })
    })
    const nextEvent = async (stream, count) => { while (stream.events.length < count) await new Promise((resolve) => stream.waiters.push(resolve)) ; return stream.events[count - 1] }

    // Every verification rotates the MCP token, so read the one GoClaw holds now.
    const mcpToken = fake.credentials.get(goclawId)['X-CN-MCP-Token']
    assert.notEqual(mcpToken, firstMcpToken)
    assert.equal((await sse(null)).status, 401)
    assert.equal((await sse(randomBytes(32).toString('base64url'))).status, 401)
    const stream = await sse(mcpToken)
    assert.equal(stream.status, 200, `sse status ${stream.status}`)
    const endpoint = await nextEvent(stream, 1)
    assert.equal(endpoint.event, 'endpoint')
    assert.match(endpoint.data, /^messages\?sessionId=[0-9a-f-]{36}$/)
    const rpc = async (id, method, params) => {
      const response = await fetch(`${base}/api/v1/mcp/${endpoint.data}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cn-mcp-token': mcpToken }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) })
      assert.equal(response.status, 202)
      return JSON.parse((await nextEvent(stream, stream.events.length + 1)).data)
    }
    const init = await rpc(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'qa', version: '1' } })
    assert.equal(init.result.protocolVersion, '2024-11-05')
    assert.deepEqual((await rpc(2, 'tools/list', {})).result.tools.map((tool) => tool.name), ['cn_find_tools', 'cn_tool_guide', 'cn_open_tool'])
    const found = JSON.parse((await rpc(3, 'tools/call', { name: 'cn_find_tools', arguments: { query: 'nén pdf', locale: 'vi' } })).result.content[0].text)
    assert.equal(found.tools[0].slug, 'nen-pdf')
    const guide = JSON.parse((await rpc(4, 'tools/call', { name: 'cn_tool_guide', arguments: { slug: 'nen-pdf', locale: 'en' } })).result.content[0].text)
    assert.equal(guide.name, 'Compress PDF')
    assert.ok(guide.guides.length >= 1)
    const open = (await rpc(5, 'tools/call', { name: 'cn_open_tool', arguments: { slug: 'nen-pdf', params: { level: 'strong' } } })).result
    assert.match(open.content[0].text, /```cn-action\n\{"type":"open-tool","slug":"nen-pdf","params":\{"level":"strong"\}\}\n```/)
    assert.equal((await rpc(6, 'tools/call', { name: 'cn_open_tool', arguments: { slug: 'khong-co' } })).result.isError, true)
    assert.equal((await rpc(7, 'tools/call', { name: 'cn_open_tool', arguments: { slug: 'nen-pdf', params: { 'bad key': 'x' } } })).result.isError, true)
    assert.equal((await rpc(8, 'no/such', {})).error.code, -32601)
    const foreign = await fetch(`${base}/api/v1/mcp/${endpoint.data}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cn-mcp-token': randomBytes(32).toString('base64url') }, body: '{"jsonrpc":"2.0","id":9,"method":"ping"}' })
    assert.equal(foreign.status, 403, 'a stream cannot be driven with another token')

    // Staff switch: the user cannot undo it by verifying again.
    const listed = (await call(owner, 'GET', `/admin/ai?q=${encodeURIComponent(`qa-ai-pro-${tag}`)}`)).json()
    assert.equal(listed.total, 1)
    assert.equal(listed.items[0].agentStatus, 'active')
    assert.equal((await call(owner, 'GET', '/admin/ai/status')).json().mcpRegistered, true)
    const beforeDisable = fake.calls.length
    assert.equal((await call(owner, 'POST', `/admin/ai/${pro.id}/disable`)).json().ok, true)
    assert.equal(agent.status, 'inactive')
    assert.equal(provider.enabled, false)
    const disableCalls = fake.calls.slice(beforeDisable)
    const agentOffAt = disableCalls.findIndex((entry) => entry.method === 'PUT' && entry.path === `/v1/agents/${agent.id}` && entry.body.status === 'inactive')
    const providerOffAt = disableCalls.findIndex((entry) => entry.method === 'PUT' && entry.path.startsWith('/v1/providers/') && entry.body.enabled === false)
    assert.ok(agentOffAt >= 0 && providerOffAt > agentOffAt, 'staff switch also turns the agent off first')
    assert.equal((await call(pro, 'POST', '/ai/provider/verify', { model: 'gpt-test' })).json().code, 'AI_DISABLED')
    assert.equal((await call(pro, 'POST', '/ai/session')).json().code, 'AI_DISABLED')
    const revokedPost = await fetch(`${base}/api/v1/mcp/${endpoint.data}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":10,"method":"ping"}' })
    assert.equal(revokedPost.status, 401, 'a revoked token closes the stream')
    stream.close()
    await call(owner, 'POST', `/admin/ai/${pro.id}/enable`)
    assert.equal((await call(pro, 'GET', '/ai/setup')).json().provider.status, 'failed')
    assert.equal((await call(pro, 'POST', '/ai/provider/verify', { model: 'gpt-test' })).json().agent.status, 'active')
    const [audit] = await database.pool.execute("SELECT action FROM admin_audit WHERE target_type = 'ai' AND target_id = ? ORDER BY id", [pro.id])
    assert.deepEqual(audit.map((entry) => entry.action), ['AI_DISABLE', 'AI_ENABLE'])

    // Removing the key: agent off BEFORE the provider disappears.
    const markBefore = fake.calls.length
    const removed = (await call(pro, 'DELETE', '/ai/provider')).json()
    assert.equal(removed.provider, null)
    assert.equal(removed.agent.status, 'inactive')
    const recent = fake.calls.slice(markBefore)
    const offAt = recent.findIndex((entry) => entry.method === 'PUT' && entry.path === `/v1/agents/${agent.id}` && entry.body.status === 'inactive')
    const deleteAt = recent.findIndex((entry) => entry.method === 'DELETE' && entry.path.startsWith('/v1/providers/'))
    assert.ok(offAt >= 0 && deleteAt > offAt, 'agent switched off before its provider is deleted')
    assert.equal(fake.providers.size, 0)
    assert.equal(fake.credentials.has(goclawId), false)
    assert.equal((await sse(mcpToken)).status, 401)

    // Account deletion removes the GoClaw agent and our rows.
    await app.get(AccountDeletionService).delete(pro.id, 'qa')
    assert.equal(fake.agents.size, 0)
    for (const table of ['ai_agents', 'ai_providers', 'mcp_tokens']) {
      const [rows] = await database.pool.execute(`SELECT COUNT(*) AS total FROM ${table} WHERE user_id = ?`, [pro.id])
      assert.equal(Number(rows[0].total), 0, table)
    }
  } finally {
    if (database) {
      for (const user of users) {
        for (const table of ['ai_agents', 'ai_providers', 'mcp_tokens', 'user_sessions', 'user_plans', 'user_roles', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ? OR target_id = ?', [user.id, user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
