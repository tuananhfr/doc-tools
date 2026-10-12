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

/** App + throwaway users for the WP5 feedback tests; `close()` removes every row they made. */
async function feedbackHarness(prefix) {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  await app.init()
  const api = app.getHttpAdapter().getInstance(); await api.ready()
  const database = app.get(DatabaseService)
  const tag = randomBytes(7).toString('hex')
  const toolId = `${prefix}-${tag}`
  const ip = `198.51.100.${randomBytes(1)[0] || 1}`
  const users = []
  const hash = value => createHash('sha256').update(value).digest('hex')
  const floodHash = value => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')
  const person = async (role) => {
    const id = randomUUID(); const token = randomBytes(32).toString('base64url'); const now = Math.floor(Date.now() / 1000)
    await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `${prefix}-${randomBytes(5).toString('hex')}@example.test`])
    await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [hash(token), id, now, now + 3600, now])
    if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
    const user = { id, cookie: `cn_session=${token}` }; users.push(user); return user
  }
  const headers = user => ({ ...(user ? { cookie: user.cookie } : {}), 'x-cn-request': '1', origin: 'https://site.test', 'x-forwarded-for': ip })
  const send = (payload, user, key = randomBytes(24).toString('base64url')) => api.inject({ method: 'POST', url: '/api/v1/contributions', remoteAddress: '127.0.0.1', headers: { ...headers(user), 'idempotency-key': key }, payload })
  const bug = text => ({ toolId, domain: 'feedback-bug', proposedChanges: [{ field: 'bug', before: '', after: text }], sourceRefs: [] })
  const admin = (user, method, path, payload) => api.inject({ method, url: `/api/v1/admin${path}`, headers: headers(user), payload })
  const idOf = async code => { const [[row]] = await database.pool.execute('SELECT id FROM contributions WHERE receipt_hash = ?', [hash(code)]); return row.id }
  const state = async id => { const [[row]] = await database.pool.execute('SELECT s.status, s.duplicate_of, s.triaged_by, w.status AS legacy FROM contribution_feedback_state s JOIN contribution_feedback_workflow w ON w.contribution_id = s.contribution_id WHERE s.contribution_id = ?', [id]); return row }
  const close = async () => {
    try {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const { id } of rows) {
        for (const table of ['contribution_feedback_state', 'contribution_feedback_workflow', 'contribution_feedback_keys', 'contribution_submitters', 'contribution_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE contribution_id = ?`, [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE target_type = ? AND target_id = ?', ['contribution', id])
      }
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await database.pool.execute("DELETE FROM app_settings WHERE setting_key = 'feedback.autoDedupe'")
      for (const user of users) {
        for (const table of ['user_sessions', 'user_roles']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
      for (const key of [floodHash(`contribution:${ip}`), ...users.map(user => floodHash(`contribution-user:${user.id}`))]) {
        await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [key])
        await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [key])
      }
    } finally { await app.close() }
  }
  return { api, database, tag, toolId, person, headers, send, bug, admin, idOf, state, close }
}

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
        for (const table of ['contribution_feedback_state', 'contribution_feedback_workflow', 'contribution_feedback_keys', 'contribution_submitters', 'contribution_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE contribution_id = ?`, [id])
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

const { migrateFeedbackState } = require('../dist/database/migrations')
const { feedbackKey, normalizeFeedbackText } = require('../dist/contributions/feedback-workflow')

test('feedback keys ignore spacing and case but keep Vietnamese marks', () => {
  assert.equal(normalizeFeedbackText('  Nút TẢI\n\n không   chạy '), 'nút tải không chạy')
  const changes = text => [{ field: 'bug', before: '', after: text }]
  assert.equal(feedbackKey('nen-anh', 'feedback-bug', changes('Nút tải không chạy')), feedbackKey('nen-anh', 'feedback-bug', changes('nút  TẢI không chạy ')))
  assert.notEqual(feedbackKey('nen-anh', 'feedback-bug', changes('Nút tải không chạy')), feedbackKey('nen-anh', 'feedback-bug', changes('Nút tai khong chay')))
  assert.notEqual(feedbackKey('nen-anh', 'feedback-bug', changes('x')), feedbackKey('nen-anh', 'feedback-improvement', changes('x')))
  assert.notEqual(feedbackKey('nen-anh', 'feedback-bug', changes('x')), feedbackKey('ghep-pdf', 'feedback-bug', changes('x')))
})

test('feedback state migration copies legacy rows once and keys them for dedupe', async () => {
  const database = new DatabaseService()
  const tag = randomBytes(7).toString('hex')
  const toolId = `qa-migrate-${tag}`
  const id = randomUUID()
  const hash = value => createHash('sha256').update(value).digest('hex')
  const changes = [{ field: 'bug', before: '', after: `Legacy report ${tag}` }]
  try {
    await database.onModuleInit()
    // A row as the pre-WP5 build wrote it: the ENUM table only, no state or key row.
    await database.pool.execute('INSERT INTO contributions (id, receipt_hash, duplicate_hash, tool_id, domain, risk, proposed_changes, source_refs, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, hash(`r${tag}`), hash(`d${tag}`), toolId, 'feedback-bug', 'LOW', JSON.stringify(changes), '[]', 'NEEDS_REVIEW'])
    await database.pool.execute('INSERT INTO contribution_feedback_workflow (contribution_id, status) VALUES (?, ?)', [id, 'IN_PROGRESS'])
    await migrateFeedbackState(database.pool)
    await migrateFeedbackState(database.pool)
    const [states] = await database.pool.execute('SELECT status, duplicate_of FROM contribution_feedback_state WHERE contribution_id = ?', [id])
    assert.deepEqual(states.map(row => ({ status: row.status, duplicateOf: row.duplicate_of })), [{ status: 'IN_PROGRESS', duplicateOf: null }])
    const [keys] = await database.pool.execute('SELECT feedback_key FROM contribution_feedback_keys WHERE contribution_id = ?', [id])
    assert.deepEqual(keys.map(row => row.feedback_key), [feedbackKey(toolId, 'feedback-bug', changes)])
    // A status already moved in the new table is never overwritten by a later start.
    await database.pool.execute("UPDATE contribution_feedback_state SET status = 'RELEASED' WHERE contribution_id = ?", [id])
    await migrateFeedbackState(database.pool)
    const [[after]] = await database.pool.execute('SELECT status FROM contribution_feedback_state WHERE contribution_id = ?', [id])
    assert.equal(after.status, 'RELEASED')
  } finally {
    for (const table of ['contribution_feedback_state', 'contribution_feedback_workflow', 'contribution_feedback_keys']) await database.pool.execute(`DELETE FROM ${table} WHERE contribution_id = ?`, [id]).catch(() => undefined)
    await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId]).catch(() => undefined)
    await database.onModuleDestroy()
  }
})

test('feedback workflow: triage, release, manual merge and the rollback copy', async () => {
  const h = await feedbackHarness('qa-triage')
  try {
    const owner = await h.person('owner'); const member = await h.person(null)
    const step = (id, payload) => h.admin(owner, 'POST', `/contributions/${id}/transition`, payload)
    const first = await h.send(h.bug(`Nút tải không chạy ${h.tag}`), member)
    assert.equal(first.statusCode, 200, first.payload); assert.equal(first.json().status, 'RECEIVED')
    const original = await h.idOf(first.json().receiptCode)
    assert.deepEqual({ ...await h.state(original) }, { status: 'RECEIVED', duplicate_of: null, triaged_by: null, legacy: 'RECEIVED' })
    assert.equal((await step(original, { action: 'release' })).json().code, 'INVALID_STATE')
    assert.equal((await step(original, { action: 'triage', note: 'Reproduced on Android' })).json().status, 'TRIAGED')
    const triaged = await h.state(original)
    assert.equal(triaged.status, 'TRIAGED'); assert.equal(triaged.legacy, 'RECEIVED'); assert.ok(triaged.triaged_by)
    assert.equal((await step(original, { action: 'triage' })).json().code, 'INVALID_STATE')
    assert.equal((await step(original, { action: 'start' })).json().status, 'IN_PROGRESS')
    assert.equal((await step(original, { action: 'resolve', note: 'Download button fixed' })).json().status, 'RESOLVED')
    assert.equal((await step(original, { action: 'release' })).json().status, 'RELEASED')
    assert.equal((await h.state(original)).legacy, 'RESOLVED')
    assert.equal((await step(original, { action: 'release' })).json().code, 'INVALID_STATE')
    assert.equal((await h.api.inject({ method: 'GET', url: `/api/v1/contributions/receipt/${first.json().receiptCode}` })).json().contribution.status, 'RELEASED')

    const other = await h.idOf((await h.send(h.bug(`Ảnh xem trước bị mờ ${h.tag}`), member)).json().receiptCode)
    const third = await h.idOf((await h.send(h.bug(`Ảnh xem trước bị mờ trên iPhone ${h.tag}`), member)).json().receiptCode)
    const fourth = await h.idOf((await h.send(h.bug(`Xem trước mờ sau khi nén ${h.tag}`), member)).json().receiptCode)
    assert.equal((await step(other, { action: 'dedupe' })).statusCode, 400, 'target is required')
    assert.equal((await step(other, { action: 'dedupe', duplicateOf: other })).json().code, 'DUPLICATE_TARGET')
    assert.equal((await step(third, { action: 'dedupe', duplicateOf: other })).json().status, 'DEDUPED')
    assert.equal((await step(other, { action: 'dedupe', duplicateOf: third })).json().code, 'DUPLICATE_TARGET', 'no merge loops')
    // Merging into a copy points at that copy's original, so reading a chain is one hop.
    assert.equal((await step(fourth, { action: 'dedupe', duplicateOf: third, note: 'Same blur report' })).json().status, 'DEDUPED')
    assert.equal((await h.state(fourth)).duplicate_of, other)
    assert.equal((await h.state(fourth)).legacy, 'RESOLVED')
    assert.equal((await step(fourth, { action: 'start' })).json().code, 'INVALID_STATE')
    const detail = (await h.admin(owner, 'GET', `/contributions/${other}`)).json().contribution
    assert.equal(detail.duplicateCount, 2); assert.equal(detail.duplicateOf, null)
    assert.equal((await h.admin(owner, 'GET', `/contributions/${fourth}`)).json().contribution.duplicateOf, other)
    const queue = (await h.admin(owner, 'GET', '/contributions?queue=open&domain=feedback-bug')).json().items.map(item => item.id)
    assert.ok(queue.includes(other)); assert.ok(!queue.includes(fourth))
    assert.ok((await h.admin(owner, 'GET', '/contributions?status=DEDUPED&domain=feedback-bug')).json().items.some(item => item.id === fourth))
    const mine = (await h.api.inject({ method: 'GET', url: '/api/v1/me/contributions', headers: h.headers(member) })).json()
    assert.ok(mine.items.some(item => item.id === fourth && item.status === 'DEDUPED' && !item.canAddEvidence))
    const idea = await h.send({ toolId: h.toolId, domain: 'ideas', proposedChanges: [{ field: 'idea', before: '', after: `Công cụ ghép ảnh dọc ${h.tag}` }], sourceRefs: [] }, member)
    const ideaId = await h.idOf(idea.json().receiptCode)
    for (const action of ['triage', 'release']) assert.equal((await step(ideaId, { action })).json().code, 'INVALID_STATE')
    assert.equal((await step(ideaId, { action: 'dedupe', duplicateOf: other })).json().code, 'INVALID_STATE')
  } finally { await h.close() }
})
