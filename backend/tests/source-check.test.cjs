const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto')
// Must be set before configuration() is first read; dotenv never overrides existing variables.
process.env.SITE_ORIGINS = 'https://site.test'
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')
const { RulesService } = require('../dist/rules/rules.service')
const { McpToolsService } = require('../dist/mcp/mcp-tools.service')
const { ContributionDraftsService, MAX_OPEN_DRAFTS } = require('../dist/contributions/contribution-drafts.service')
const { parseDraftInput } = require('../dist/contributions/draft-input')
const { rulePackageDigest } = require('../dist/rules/rule-package')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')

async function signedInUser(database, tag, pro) {
  const id = randomUUID()
  const token = randomBytes(32).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-${tag}-${randomBytes(6).toString('hex')}@example.test`])
  await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
  if (pro) await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [id, now - 60, now + 86400])
  return { id, cookie: `cn_session=${token}` }
}

const pack = (kind, data) => ({
  version: 1, kind, keyId: 'qa', effectiveFrom: '2025-05-10', publishedAt: '2025-05-09T00:00:00Z',
  source: { title: 'QA official notice', url: 'https://example.gov.vn/notice', retrievedAt: '2025-05-09T00:00:00Z', sha256: 'c'.repeat(64) },
  data, signature: 'x'.repeat(86),
})

test('the agent drafts, the person picks, and only a NEEDS_REVIEW contribution comes out', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const tools = app.get(McpToolsService)
    const rules = app.get(RulesService)
    const owner = await signedInUser(database, 'check-owner', true); users.push(owner)
    const stranger = await signedInUser(database, 'check-stranger', false); users.push(stranger)
    const call = async (name, args, user = owner) => {
      const result = await tools.call(name, args, user.id)
      return result.isError ? { error: result.content[0].text } : JSON.parse(result.content[0].text)
    }
    const site = (user, extra = {}) => ({ cookie: user.cookie, 'x-cn-request': '1', origin: 'https://site.test', ...extra })
    const request = (user, method, url, payload, trusted = true) => api.inject({ method, url: `/api/v1${url}`, payload, headers: trusted ? site(user) : { cookie: user.cookie } })

    // Rules as the agent sees them; the store itself is covered by rules.test.cjs.
    assert.match((await call('cn_get_rules', { kind: 'gold' })).error, /electricity, vat, payroll, addresses/)
    const electricity = pack('electricity', { tiers: [{ upTo: 50, price: 1984 }, { upTo: null, price: 3460 }] })
    const wards = pack('addresses', { provinces: [{ name: 'Tuyên Quang', old: ['Tuyên Quang', 'Hà Giang'] }], wards: [
      { oldProvince: 'Hà Giang', oldDistrict: 'Bắc Mê', oldWard: 'Xã Yên Phong', newProvince: 'Tuyên Quang', newWard: 'Xã Yên Cường' },
      { oldProvince: 'Hà Nội', oldDistrict: 'Ba Đình', oldWard: 'Phường Kim Mã', newProvince: 'Hà Nội', newWard: 'Phường Giảng Võ' },
    ] })
    const original = rules.active.bind(rules)
    rules.active = async (kind) => ({ ok: true, package: kind === 'electricity' ? electricity : kind === 'addresses' ? wards : null, upcoming: null })
    const current = await call('cn_get_rules', { kind: 'electricity' })
    assert.equal(current.current.snapshotId, rulePackageDigest(electricity))
    assert.deepEqual(current.current.data, electricity.data)
    assert.equal(current.current.source.url, 'https://example.gov.vn/notice')
    assert.match(current.fieldHint, /tiers\.<i>\.price/)
    const addresses = await call('cn_get_rules', { kind: 'addresses', query: 'yen phong' })
    assert.equal(addresses.current.data.wardCount, 2)
    assert.deepEqual(addresses.current.data.wardMatches.map((row) => row.newWard), ['Xã Yên Cường'], 'diacritic-insensitive lookup, only matching rows')
    assert.equal((await call('cn_get_rules', { kind: 'vat' })).current, null)
    rules.active = async () => { throw new Error('no key') }
    assert.match((await call('cn_get_rules', { kind: 'payroll' })).error, /không đọc được/)
    rules.active = original

    // A source check is recorded only for the person's own chat, and only with Pro.
    const sessionKey = `agent:cn-${owner.id}:ws:direct:${randomUUID()}`
    const snapshotId = rulePackageDigest(electricity)
    assert.equal((await request(owner, 'POST', '/ai/source-checks', { toolId: 'tien-dien', baseSnapshotId: snapshotId, sessionKey }, false)).statusCode, 403, 'site header required')
    assert.equal((await request(stranger, 'POST', '/ai/source-checks', { toolId: 'tien-dien', sessionKey })).json().code, 'PRO_REQUIRED')
    assert.equal((await request(owner, 'POST', '/ai/source-checks', { toolId: 'tien-dien', sessionKey: `agent:cn-${stranger.id}:ws:direct:${randomUUID()}` })).statusCode, 400)
    assert.equal((await request(owner, 'POST', '/ai/source-checks', { toolId: 'khong-co', sessionKey })).statusCode, 400)
    const check = await request(owner, 'POST', '/ai/source-checks', { toolId: 'tien-dien', baseSnapshotId: snapshotId, sessionKey })
    assert.equal(check.statusCode, 200, check.payload)

    // Drafts: validated like a contribution, with sources mandatory for high-risk domains.
    const draft = {
      toolId: 'tien-dien', domain: 'electricity', baseSnapshotId: snapshotId, jurisdiction: 'VN',
      changes: [{ field: 'tiers.0.price', before: '1984', after: `${2000 + (randomBytes(2).readUInt16BE() % 900)}` }, { field: 'tiers.1.price', before: '3460', after: '3500' }],
      sources: [{ url: `https://example.gov.vn/qd-${randomBytes(4).toString('hex')}`, type: 'OFFICIAL_DOCUMENT' }],
      uncertainties: ['Chưa rõ ngày hiệu lực cho khách hàng sinh hoạt bậc 6'],
    }
    assert.match((await call('cn_create_contribution_draft', { ...draft, toolId: 'khong-co' })).error, /toolId/)
    assert.match((await call('cn_create_contribution_draft', { ...draft, sources: [] })).error, /nguồn chính thức/)
    assert.match((await call('cn_create_contribution_draft', { ...draft, changes: [{ field: 'tiers.0.price', before: '1', after: 'gọi 0912345678' }] })).error, /không chứa email, số điện thoại/)
    assert.match((await call('cn_create_contribution_draft', { ...draft, sources: [{ url: 'http://10.0.0.1/x', type: 'OTHER' }] })).error, /https công khai/)
    assert.equal(typeof parseDraftInput({ ...draft, uncertainties: 'x' }), 'string')
    const created = await call('cn_create_contribution_draft', draft)
    assert.match(created.draftId, /^[0-9a-f-]{36}$/)
    assert.match(created.note, /Đừng nói là đã gửi/)
    const [[linked]] = await database.pool.execute('SELECT draft_id, base_snapshot_id FROM ai_source_checks WHERE id = ?', [check.json().id])
    assert.deepEqual({ ...linked }, { draft_id: created.draftId, base_snapshot_id: snapshotId })

    // Only the owner sees and acts on a draft.
    const listed = (await request(owner, 'GET', '/me/contribution-drafts?toolId=tien-dien')).json()
    assert.equal(listed.items.length, 1)
    assert.deepEqual(listed.items[0].uncertainties, draft.uncertainties)
    assert.equal(listed.items[0].createdBy, 'agent')
    assert.equal((await request(owner, 'GET', '/me/contribution-drafts?toolId=luong')).json().items.length, 0)
    assert.equal((await request(stranger, 'GET', '/me/contribution-drafts')).json().items.length, 0)
    assert.equal((await request(stranger, 'POST', `/me/contribution-drafts/${created.draftId}/submit`, { selectedIndexes: [0] })).statusCode, 404)
    assert.equal((await request(stranger, 'DELETE', `/me/contribution-drafts/${created.draftId}`)).statusCode, 404)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me/contribution-drafts' })).statusCode, 401)

    // Submitting: site header, a real selection, then exactly one contribution waiting for review.
    const submitUrl = `/me/contribution-drafts/${created.draftId}/submit`
    assert.equal((await request(owner, 'POST', submitUrl, { selectedIndexes: [1] }, false)).statusCode, 403)
    assert.equal((await request(owner, 'POST', submitUrl, { selectedIndexes: [] })).json().code, 'SELECTION_INVALID')
    assert.equal((await request(owner, 'POST', submitUrl, { selectedIndexes: [2] })).json().code, 'SELECTION_INVALID')
    assert.equal((await request(owner, 'POST', submitUrl, { selectedIndexes: [1, 1] })).json().code, 'SELECTION_INVALID')
    const sent = await request(owner, 'POST', submitUrl, { selectedIndexes: [1], attribution: true })
    assert.equal(sent.statusCode, 200, sent.payload)
    assert.equal(sent.json().status, 'NEEDS_REVIEW')
    assert.equal(sent.json().tracked, true)
    const contributionId = sent.json().contributionId
    const [[row]] = await database.pool.execute('SELECT c.status, c.proposed_changes, c.base_snapshot_id, s.user_id, s.attribution_consent FROM contributions c JOIN contribution_submitters s ON s.contribution_id = c.id WHERE c.id = ?', [contributionId])
    assert.equal(row.status, 'NEEDS_REVIEW', 'AI output never skips review')
    assert.deepEqual(row.proposed_changes, [draft.changes[1]], 'only the picked row is sent')
    assert.equal(row.base_snapshot_id, snapshotId)
    assert.equal(row.user_id, owner.id)
    assert.equal(row.attribution_consent, 1)
    const [audit] = await database.pool.execute('SELECT action FROM contribution_audit WHERE contribution_id = ?', [contributionId])
    assert.deepEqual(audit.map((entry) => entry.action), ['SUBMITTED'])
    assert.equal((await request(owner, 'POST', submitUrl, { selectedIndexes: [0] })).statusCode, 404, 'a draft is sent once')
    assert.equal((await request(owner, 'GET', '/me/contribution-drafts')).json().items.length, 0)

    // A refused submission (duplicate) hands the draft back instead of losing it.
    const again = await call('cn_create_contribution_draft', draft)
    const duplicate = await request(owner, 'POST', `/me/contribution-drafts/${again.draftId}/submit`, { selectedIndexes: [1], attribution: true })
    assert.equal(duplicate.statusCode, 409)
    assert.equal((await request(owner, 'GET', '/me/contribution-drafts')).json().items.length, 1, 'still open after a refused submit')

    const mine = await call('cn_my_contributions', {})
    assert.equal(mine.contributions.length, 1)
    assert.equal(mine.contributions[0].status, 'NEEDS_REVIEW')
    assert.equal(mine.openDrafts.length, 1)
    assert.equal((await call('cn_my_contributions', { status: 'PUBLISHED' })).contributions.length, 0)

    assert.equal((await request(owner, 'DELETE', `/me/contribution-drafts/${again.draftId}`)).json().ok, true)
    assert.equal((await request(owner, 'GET', '/me/contribution-drafts')).json().items.length, 0)

    // The agent cannot bury the person in drafts.
    const service = app.get(ContributionDraftsService)
    const parsed = parseDraftInput(draft)
    for (let index = 0; index < MAX_OPEN_DRAFTS; index++) assert.ok((await service.create(owner.id, parsed, 'agent')).id)
    assert.match((await call('cn_create_contribution_draft', draft)).error, /quá nhiều nháp/)
  } finally {
    if (database) {
      for (const user of users) {
        const [own] = await database.pool.execute('SELECT contribution_id FROM contribution_submitters WHERE user_id = ?', [user.id])
        for (const { contribution_id: id } of own) {
          await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [id])
          await database.pool.execute('DELETE FROM contributions WHERE id = ?', [id])
        }
        for (const table of ['contribution_submitters', 'contribution_drafts', 'ai_source_checks', 'user_sessions', 'user_plans', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [hmac(`contribution-user:${user.id}`)])
        await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [hmac(`contribution-user:${user.id}`)])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
