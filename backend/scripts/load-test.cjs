// Load test against a LOCAL in-process backend only. Boots AppModule on 127.0.0.1 with a random port,
// drives it with autocannon fetched through npx (not a dependency), then deletes every qa-load-* row.
//   npm run build && node scripts/load-test.cjs        (needs the dev MariaDB from backend/.env)
// There is deliberately no URL option: this must never be pointed at production.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { spawn } = require('node:child_process')
const { createHmac, randomBytes } = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')

const AUTOCANNON = 'autocannon@7.15.0'
const P99_LIMIT_MS = Number(process.env.P99_LIMIT_MS ?? 2000)
const ip = `198.51.100.${(randomBytes(1)[0] % 200) + 1}`
const slug = 'qa-load-' + randomBytes(6).toString('hex')
const toolId = 'qa-load-' + randomBytes(6).toString('hex')
const visitHash = createHmac('sha256', process.env.VISIT_HASH_SECRET).update(ip).digest('hex')
const contributionHash = createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`contribution:${ip}`).digest('hex')
const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip, 'x-cn-request': '1' }

async function cannon(url, { method = 'GET', body, connections, amount }) {
  const args = ['-y', AUTOCANNON, '--json', '-c', String(connections), '-a', String(amount), '-t', '10', '-m', method]
  for (const [key, value] of Object.entries(headers)) args.push('-H', `${key}=${value}`)
  let file = null
  if (body !== undefined) {
    file = path.join(os.tmpdir(), `load-${randomBytes(4).toString('hex')}.json`)
    fs.writeFileSync(file, JSON.stringify(body))
    args.push('-i', file)
  }
  args.push(url)
  // Async on purpose: the server under test lives in this process, and spawnSync would block its event loop.
  // npx is a .cmd shim on Windows; Node refuses to spawn .cmd without a shell.
  const run = await new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { shell: process.platform === 'win32' })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
  if (file) fs.rmSync(file, { force: true })
  if (run.status !== 0) throw new Error(`autocannon exited ${run.status}: ${(run.stderr || '').slice(-400)}`)
  const json = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')))
  return {
    sent: json.requests.sent, ok2xx: json['2xx'], c4xx: json['4xx'], c5xx: json['5xx'], non2xx: json.non2xx,
    errors: json.errors, timeouts: json.timeouts, p99: json.latency.p99,
    codes: Object.fromEntries(Object.entries(json.statusCodeStats ?? {}).map(([code, stat]) => [code, stat.count])),
  }
}

async function main() {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const scenarios = {}
  const failed = []
  const expect = (name, condition, detail) => { if (!condition) failed.push(`${name}: ${detail}`) }
  let database
  try {
    await app.listen(0, '127.0.0.1')
    database = app.get(DatabaseService)
    const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`

    const visits = scenarios.visits = await cannon(`${base}/tools/visits`, { method: 'POST', body: { tool: slug }, connections: 50, amount: 3000 })
    expect('visits', visits.c5xx === 0 && visits.errors === 0 && visits.timeouts === 0 && visits.non2xx === 0, JSON.stringify(visits))
    expect('visits', visits.p99 < P99_LIMIT_MS, `p99 ${visits.p99} ms >= ${P99_LIMIT_MS}`)
    const stats = await (await fetch(`${base}/tools/stats`)).json()
    scenarios.visits.counted = stats.tools?.[slug] ?? 0
    // Over the 120/hour/IP cap visits still answer ok but are not counted.
    expect('visits', scenarios.visits.counted >= 1 && scenarios.visits.counted <= 120, `counted ${scenarios.visits.counted}`)

    const bodies = Array.from({ length: 30 }, (_, index) => ({ toolId, domain: 'electricity', baseSnapshotId: null, proposedChanges: [{ field: 'tier.1', before: '100', after: String(200 + index) }], sourceRefs: [{ url: 'https://example.com/official', type: 'OFFICIAL_WEB' }], jurisdiction: 'VN' }))
    const replies = []
    for (let index = 0; index < bodies.length; index += 10) {
      replies.push(...await Promise.all(bodies.slice(index, index + 10).map(async (body) => {
        const response = await fetch(`${base}/contributions`, { method: 'POST', headers, body: JSON.stringify(body) })
        return { status: response.status, json: await response.json().catch(() => null) }
      })))
    }
    const limited = replies.filter((reply) => reply.status === 429)
    scenarios.contributions = { statuses: replies.reduce((count, reply) => ({ ...count, [reply.status]: (count[reply.status] ?? 0) + 1 }), {}), sample429: limited[0]?.json ?? null }
    expect('contributions', replies.every((reply) => reply.status === 200 || reply.status === 429), JSON.stringify(scenarios.contributions.statuses))
    expect('contributions', limited.length > 0 && limited.every((reply) => reply.json?.code === 'RATE_LIMITED' && typeof reply.json?.message === 'string' && reply.json.message.length > 0), 'no readable 429')
    const flood = scenarios.contributionFlood = await cannon(`${base}/contributions`, { method: 'POST', body: { ...bodies[0], proposedChanges: [{ field: 'tier.1', before: '100', after: '999' }] }, connections: 10, amount: 500 })
    expect('contributionFlood', flood.ok2xx === 0 && flood.c5xx === 0 && flood.errors === 0, JSON.stringify(flood))

    const read = scenarios.readExtract = await cannon(`${base}/read/extract`, { method: 'POST', body: { url: 'https://127.0.0.1/' }, connections: 50, amount: 1000 })
    expect('readExtract', read.c5xx === 0 && read.errors === 0 && read.timeouts === 0, JSON.stringify(read))
    if (read.codes['404'] === read.sent) {
      // read.linkEnabled is off by default and must stay off on shared databases, so every call answers
      // 404 READ_DISABLED; only a 404 without that code means the route itself is missing.
      const sample = await fetch(`${base}/read/extract`, { method: 'POST', headers, body: JSON.stringify({ url: 'https://127.0.0.1/' }) })
      const json = await sample.json().catch(() => null)
      scenarios.readExtract.linkEnabled = false
      expect('readExtract', sample.status === 404 && json?.code === 'READ_DISABLED', 'route missing (WP4-B not merged?)')
    }
    expect('readExtract', read.ok2xx === 0, 'a private URL was fetched')
    if (read.codes['429']) {
      const sample = await fetch(`${base}/read/extract`, { method: 'POST', headers, body: JSON.stringify({ url: 'https://127.0.0.1/' }) })
      scenarios.readExtract.sample429 = sample.status === 429 ? await sample.json().catch(() => null) : null
      expect('readExtract', sample.status !== 429 || typeof scenarios.readExtract.sample429?.message === 'string', '429 without a message')
    }

    const getStats = scenarios.stats = await cannon(`${base}/tools/stats`, { connections: 50, amount: 3000 })
    expect('stats', getStats.non2xx === 0 && getStats.errors === 0 && getStats.timeouts === 0, JSON.stringify(getStats))
    expect('stats', getStats.p99 < P99_LIMIT_MS, `p99 ${getStats.p99} ms >= ${P99_LIMIT_MS}`)
  } catch (error) {
    failed.push(`crash: ${String(error).split('\n')[0]}`)
  } finally {
    if (database) {
      const pool = database.pool
      const [tables] = await pool.query("SELECT DISTINCT TABLE_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'contribution_id'")
      const [rows] = await pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const { name } of tables) for (const row of rows) await pool.execute(`DELETE FROM \`${name}\` WHERE contribution_id = ?`, [row.id])
      await pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [contributionHash])
      await pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [contributionHash])
      await pool.execute('DELETE FROM tool_visits WHERE tool = ?', [slug])
      await pool.execute('DELETE FROM tool_visit_days WHERE tool = ?', [slug])
      await pool.execute('DELETE FROM visit_flood_events WHERE ip_hash = ?', [visitHash])
      await pool.execute('DELETE FROM visit_flood_locks WHERE ip_hash = ?', [visitHash])
    }
    await app.close()
  }
  const report = { ok: failed.length === 0, p99LimitMs: P99_LIMIT_MS, ip, scenarios, failed }
  if (process.env.LOAD_OUT) fs.writeFileSync(process.env.LOAD_OUT, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report))
  process.exit(failed.length ? 1 : 0)
}

main()
