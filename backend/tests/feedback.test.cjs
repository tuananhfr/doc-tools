process.env.CONFIG_FROM_ENV_ONLY = '1'
process.env.SITE_ORIGINS = 'https://site.test'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')
const { ContributionsRepository } = require('../dist/contributions/contributions.repository')
const { parseContributionInput, parseSourceRefs } = require('../dist/contributions/contribution-input')

test('source and general-feedback validation reject incompatible or private inputs', () => {
  for (const url of ['https://[::1]/a', 'https://[fd00::1]/a', 'https://[2001:db8::1]/a', 'https://intranet/a', 'https://127.0.0.1/a']) assert.equal(parseSourceRefs([{ url, type: 'OTHER' }]), null, url)
  assert.ok(parseSourceRefs([{ url: 'https://example.com/doc', type: 'OFFICIAL_WEB' }]))
  const value = { toolId: 'qa-feedback', domain: 'feedback-bug', proposedChanges: [{ field: 'bug', before: '', after: 'A problem' }], sourceRefs: [] }
  assert.ok(parseContributionInput(value))
  assert.equal(parseContributionInput({ ...value, sourceRefs: [{ url: 'https://example.com/doc', type: 'OTHER' }] }), null)
  assert.equal(parseContributionInput({ ...value, baseSnapshotId: 'a'.repeat(64) }), null)
})

test('feedback API separates internal handling from data review and retries safely', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const tag = randomBytes(7).toString('hex')
  const toolId = `qa-feedback-${tag}`
  const ip = `192.0.2.${randomBytes(1)[0] || 1}`
  const users = []
  let database
  const hash = value => createHash('sha256').update(value).digest('hex')
  const floodHash = value => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance(); await api.ready()
    database = app.get(DatabaseService)
    const repository = app.get(ContributionsRepository)
    const person = async (role) => {
      const id = randomUUID(); const token = randomBytes(32).toString('base64url'); const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-feedback-${randomBytes(5).toString('hex')}@example.test`])
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [hash(token), id, now, now + 3600, now])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const user = { id, cookie: `cn_session=${token}` }; users.push(user); return user
    }
    const reviewer = await person('reviewer'); const member = await person(null)
    const headers = user => ({ ...(user ? { cookie: user.cookie } : {}), 'x-cn-request': '1', origin: 'https://site.test', 'x-forwarded-for': ip })
    const body = (domain, text, sources = []) => ({ toolId, domain, proposedChanges: [{ field: 'feedback', before: '', after: `${text} ${tag}` }], sourceRefs: sources, attribution: true })
    const send = (payload, key, user) => api.inject({ method: 'POST', url: '/api/v1/contributions', remoteAddress: '127.0.0.1', headers: { ...headers(user), ...(key ? { 'idempotency-key': key } : {}) }, payload })
    const receiptStatus = async code => (await api.inject({ method: 'GET', url: `/api/v1/contributions/receipt/${code}` })).json()
    const key = randomBytes(24).toString('base64url')
    const input = body('feedback-bug', 'Result download is unavailable')
    const first = await send(input, key, member); assert.equal(first.statusCode, 200, first.payload)
    assert.equal(first.json().status, 'RECEIVED'); assert.equal(first.json().tracked, true)
    for (let index = 0; index < 12; index++) assert.deepEqual((await send(input, key, member)).json(), first.json(), 'lost-response retry keeps its receipt and does not consume the hourly allowance')
    assert.equal((await send(input, randomBytes(24).toString('base64url'), member)).json().code, 'DUPLICATE_CONTRIBUTION')
    assert.equal((await send(body('feedback-bug', 'Different content'), key, member)).json().code, 'IDEMPOTENCY_CONFLICT')
    const [[row]] = await database.pool.execute('SELECT c.id, s.attribution_consent FROM contributions c JOIN contribution_submitters s ON s.contribution_id = c.id WHERE c.receipt_hash = ?', [hash(first.json().receiptCode)])
    assert.equal(row.attribution_consent, 0)
    const call = (user, method, suffix, payload) => api.inject({ method, url: `/api/v1/admin/contributions${suffix}`, headers: headers(user), payload })
    const listed = await call(reviewer, 'GET', `?domain=feedback-bug&queue=open`)
    assert.equal(listed.statusCode, 200, listed.payload); assert.ok(listed.json().items.some(item => item.id === row.id && item.status === 'RECEIVED'))
    const detail = await call(reviewer, 'GET', `/${row.id}`); assert.equal(detail.json().contribution.status, 'RECEIVED')
    assert.equal((await call(member, 'POST', `/${row.id}/transition`, { action: 'start' })).statusCode, 403)
    for (const action of ['verify', 'approve', 'publish']) assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action, note: 'Checked source reference', digest: 'a'.repeat(64) })).json().code, 'INVALID_STATE')
    assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action: 'resolve', note: 'Too early' })).json().code, 'INVALID_STATE')
    assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action: 'start' })).json().status, 'IN_PROGRESS')
    assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action: 'start' })).json().code, 'INVALID_STATE')
    assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action: 'resolve' })).statusCode, 400)
    assert.equal((await call(reviewer, 'POST', `/${row.id}/transition`, { action: 'resolve', note: 'Download interaction corrected' })).json().status, 'RESOLVED')
    assert.equal((await receiptStatus(first.json().receiptCode)).contribution.status, 'RESOLVED')
    assert.deepEqual(Object.keys((await receiptStatus(first.json().receiptCode)).contribution).sort(), ['createdAt', 'status'])
    const mine = (await api.inject({ method: 'GET', url: '/api/v1/me/contributions', headers: headers(member) })).json()
    assert.ok(mine.items.some(item => item.id === row.id && item.status === 'RESOLVED' && !item.canAddEvidence))
    assert.ok((await call(reviewer, 'GET', '?status=RESOLVED&domain=feedback-bug')).json().items.some(item => item.id === row.id))
    assert.ok(!(await call(reviewer, 'GET', '?domain=feedback-bug&queue=open')).json().items.some(item => item.id === row.id))
    assert.equal((await api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${first.json().receiptCode}/sources`, payload: { sourceRefs: [{ url: 'https://example.com/doc', type: 'OTHER' }] } })).json().code, 'EVIDENCE_CLOSED')
    const ideas = (await api.inject({ method: 'GET', url: '/api/v1/contributions/ideas' })).json().ideas
    assert.ok(!ideas.some(item => item.id === row.id))
    const improved = await send(body('feedback-improvement', 'Simpler export controls'), undefined, member)
    const [[improvement]] = await database.pool.execute('SELECT id FROM contributions WHERE receipt_hash = ?', [hash(improved.json().receiptCode)])
    assert.equal((await call(reviewer, 'POST', `/${improvement.id}/transition`, { action: 'reject', note: 'Already available in the tool' })).json().status, 'REJECTED')
    const source = { url: 'https://example.com/unverified', type: 'OTHER' }
    const data = await send(body('electricity', 'New official tier table', [source]), undefined, member)
    assert.equal(data.json().status, 'NEEDS_REVIEW')
    const official = { url: 'https://example.com/official', type: 'OFFICIAL_WEB' }
    const add = () => api.inject({ method: 'POST', url: `/api/v1/contributions/receipt/${data.json().receiptCode}/sources`, payload: { sourceRefs: [official] } })
    assert.equal((await add()).statusCode, 200); assert.equal((await add()).statusCode, 200)
    const [[dataRow]] = await database.pool.execute('SELECT id, source_refs FROM contributions WHERE receipt_hash = ?', [hash(data.json().receiptCode)])
    assert.deepEqual(dataRow.source_refs, [source, official])
    assert.equal(await repository.transition(dataRow.id, 'verify', 'qa-reviewer', 'Official reference checked', null), 'VERIFIED')
    assert.equal((await add()).json().code, 'EVIDENCE_CLOSED')
  } finally {
    if (database) {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const { id } of rows) {
        for (const table of ['contribution_feedback_workflow', 'contribution_submitters', 'contribution_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE contribution_id = ?`, [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE target_type = ? AND target_id = ?', ['contribution', id])
      }
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      for (const user of users) {
        for (const table of ['user_sessions', 'user_roles']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
      for (const key of [floodHash(`contribution:${ip}`), ...users.map(user => floodHash(`contribution-user:${user.id}`))]) {
        await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [key])
        await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [key])
      }
    }
    await app.close()
  }
})
