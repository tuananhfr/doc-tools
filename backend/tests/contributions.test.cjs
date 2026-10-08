// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac, randomBytes } = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')

test('anonymous contributions stay in review and expose only receipt status', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const ip = `198.51.100.${randomBytes(1)[0] || 1}`
  const ipHash = createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`contribution:${ip}`).digest('hex')
  const toolId = `qa-${randomBytes(8).toString('hex')}`
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const send = (body) => api.inject({ method: 'POST', url: '/api/v1/contributions', payload: body, remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip } })
    const valid = { toolId, domain: 'electricity', baseSnapshotId: null, proposedChanges: [{ field: 'tier.1', before: '100', after: '110', ignoredSecret: 'not-stored' }], sourceRefs: [{ url: 'https://example.com/official', type: 'OFFICIAL_WEB', ignoredSecret: 'not-stored' }], jurisdiction: 'VN' }
    const invalid = await send({ ...valid, proposedChanges: [{ field: 'tier.1', before: 'secret=abc', after: '110' }] })
    assert.equal(invalid.statusCode, 400)
    assert.equal((await send({ ...valid, proposedChanges: [{ field: 'tier.1', before: '100', after: 'Liên hệ 0912345678' }] })).statusCode, 400)
    assert.equal((await send({ ...valid, sourceRefs: [{ url: 'http://localhost/admin', type: 'OFFICIAL_WEB' }] })).statusCode, 400)
    const accepted = await send(valid)
    assert.equal(accepted.statusCode, 200, accepted.payload)
    const { receiptCode, status } = accepted.json()
    assert.match(receiptCode, /^[A-Za-z0-9_-]{32}$/)
    assert.equal(status, 'NEEDS_REVIEW')
    assert.deepEqual((await api.inject({ method: 'GET', url: `/api/v1/contributions/receipt/${receiptCode}` })).json().contribution.status, 'NEEDS_REVIEW')
    assert.equal((await send(valid)).statusCode, 409)
    const missingSource = await send({ ...valid, proposedChanges: [{ field: 'tier.1', before: '100', after: '115' }], sourceRefs: [] })
    assert.equal(missingSource.json().status, 'NEEDS_SOURCE')
    const sourceReceipt = missingSource.json().receiptCode
    assert.equal((await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${sourceReceipt}/sources`, payload: { sourceRefs: [{ url: 'http://localhost/private', type: 'OFFICIAL_WEB' }] } })).statusCode, 400)
    const added = await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${sourceReceipt}/sources`, payload: { sourceRefs: [{ url: 'https://example.com/update', type: 'OFFICIAL_WEB' }] } })
    assert.deepEqual(added.json(), { ok: true, status: 'NEEDS_REVIEW' })
    assert.equal((await api.inject({ method: 'GET', url: `/api/v1/contributions/receipt/${sourceReceipt}` })).json().contribution.status, 'NEEDS_REVIEW')
    assert.equal((await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${sourceReceipt}/sources`, payload: { sourceRefs: [{ url: 'https://example.com/update', type: 'OFFICIAL_WEB' }] } })).statusCode, 404)
    const [rows] = await database.pool.execute('SELECT risk, status, proposed_changes, source_refs FROM contributions WHERE tool_id = ?', [toolId])
    assert.equal(rows.length, 2)
    assert.equal(rows[0].risk, 'HIGH')
    assert.equal(rows[0].status, 'NEEDS_REVIEW')
    assert.equal(JSON.stringify(rows[0].proposed_changes).includes('not-stored'), false)
    assert.equal(JSON.stringify(rows[0].source_refs).includes('not-stored'), false)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/contributions/receipt/' + 'x'.repeat(32) })).json().contribution, null)
    for (let index = 1; index <= 4; index++) {
      const response = await send({ ...valid, proposedChanges: [{ field: 'tier.1', before: '100', after: String(110 + index) }] })
      assert.equal(response.statusCode, index < 4 ? 200 : 429, response.payload)
    }
    const bodyLimit = await api.inject({ method: 'POST', url: '/api/v1/tools/visits', payload: { tool: toolId, extra: 'x'.repeat(1100) } })
    assert.equal(bodyLimit.statusCode, 413)
    // Route limits come from @RouteConfig; before the onRoute lift every route was capped at 1 KiB.
    const sources = (size) => ({ sourceRefs: [{ url: `https://example.com/${'a'.repeat(size)}`, type: 'OFFICIAL_WEB' }] })
    const roomy = await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${'y'.repeat(32)}/sources`, payload: sources(3000) })
    assert.notEqual(roomy.statusCode, 413, roomy.payload)
    const over = await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${'y'.repeat(32)}/sources`, payload: sources(23000) })
    assert.equal(over.statusCode, 413)
  } finally {
    if (database) {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const row of rows) await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [row.id])
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [ipHash])
      await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [ipHash])
    }
    await app.close()
  }
})
