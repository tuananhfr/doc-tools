// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, randomBytes, randomUUID } = require('node:crypto')

test('Cloud saved items: Pro writes, read-only after Pro, conflicts, bookmarks, quota, history, deletion', async () => {
  process.env.SITE_ORIGINS = 'https://site.test'
  require('reflect-metadata')
  require('dotenv/config')
  const { NestFactory } = require('@nestjs/core')
  const { AppModule } = require('../dist/app.module')
  const { createHttpAdapter } = require('../dist/config/http-adapter')
  const { DatabaseService } = require('../dist/database/database.service')
  const { SettingsService } = require('../dist/settings/settings.service')
  const { AccountDeletionService } = require('../dist/accounts/account-deletion.service')

  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const tag = randomBytes(5).toString('hex')
  let database
  let settings
  let savedSettings = []
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    settings = app.get(SettingsService)
    // Settings are shared DB state: remember any override so the test puts it back.
    savedSettings = (await settings.list()).filter((setting) => setting.key.startsWith('cloud.') && setting.overridden).map(({ key, value }) => ({ key, value }))

    async function person(name, { pro = false } = {}) {
      const id = randomUUID()
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-cloud-${name}-${tag}@example.test`])
      if (pro) await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [id, now - 60, now + 86400])
      const token = randomBytes(32).toString('base64url')
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const call = (user, method, url, payload, { trusted = true } = {}) => api.inject({
      method, url: `/api/v1${url}`, payload,
      headers: { ...(user ? { cookie: user.cookie } : {}), ...(trusted ? { 'x-cn-request': '1', origin: 'https://site.test' } : {}), ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    })
    const body = (response) => JSON.parse(response.body)
    const save = (user, overrides = {}) => call(user, 'POST', '/me/saved', { toolId: 'tien-dien', title: 'Hoá đơn tháng 9', payload: { kwh: '350', lines: '50,1806' }, ...overrides })

    const free = await person('free')
    const pro = await person('pro', { pro: true })
    const other = await person('other', { pro: true })

    // Gates.
    assert.equal((await call(null, 'GET', '/me/saved')).statusCode, 401)
    const freeList = body(await call(free, 'GET', '/me/saved'))
    assert.equal(freeList.writable, false)
    assert.deepEqual(freeList.items, [])
    assert.equal(body(await save(free)).code, 'PRO_REQUIRED')
    assert.equal((await call(pro, 'POST', '/me/saved', { toolId: 'tien-dien', title: 'x', payload: {} }, { trusted: false })).statusCode, 403)

    // Validation.
    for (const bad of [{ toolId: 'khong-co' }, { toolId: '../admin' }, { title: '   ' }, { title: 'x'.repeat(121) }, { payload: [1] }, { payload: 'x' }, { payload: null }]) {
      const response = await save(pro, bad)
      assert.equal(response.statusCode, 400, JSON.stringify(bad))
      assert.equal(body(response).code, 'INVALID_INPUT')
    }
    const huge = await save(pro, { payload: { text: 'x'.repeat(260 * 1024) } })
    assert.equal(huge.statusCode, 413)
    assert.equal(body(huge).code, 'CLOUD_ITEM_TOO_LARGE')

    // Save, list (no payload), read back.
    const created = body(await save(pro, { title: '  Hoá đơn\n tháng 9  ' }))
    assert.equal(created.ok, true)
    assert.equal(created.item.title, 'Hoá đơn tháng 9')
    assert.equal(created.item.rev, 1)
    assert.equal(created.item.payload, undefined)
    const listed = body(await call(pro, 'GET', '/me/saved'))
    assert.equal(listed.writable, true)
    assert.equal(listed.items.length, 1)
    assert.equal(listed.items[0].payload, undefined)
    assert.equal(listed.usage.items, 1)
    assert.equal(listed.usage.maxItems, 500)
    assert.deepEqual(body(await call(pro, 'GET', `/me/saved/${created.item.id}`)).item.payload, { kwh: '350', lines: '50,1806' })
    assert.equal((await call(other, 'GET', `/me/saved/${created.item.id}`)).statusCode, 404)
    assert.equal((await call(pro, 'GET', '/me/saved/not-an-id')).statusCode, 404)

    // Two devices: the second write on an old revision is a conflict until forced.
    const id = created.item.id
    const first = body(await call(pro, 'PATCH', `/me/saved/${id}`, { payload: { kwh: '360' }, baseRev: 1 }))
    assert.equal(first.item.rev, 2)
    const stale = await call(pro, 'PATCH', `/me/saved/${id}`, { payload: { kwh: '999' }, baseRev: 1 })
    assert.equal(stale.statusCode, 409)
    assert.equal(body(stale).code, 'SAVED_CONFLICT')
    assert.equal(body(stale).item.rev, 2)
    const forced = body(await call(pro, 'PATCH', `/me/saved/${id}`, { payload: { kwh: '999' }, baseRev: 1, force: true }))
    assert.equal(forced.item.rev, 3)
    assert.deepEqual(body(await call(pro, 'GET', `/me/saved/${id}`)).item.payload, { kwh: '999' })
    const renamed = body(await call(pro, 'PATCH', `/me/saved/${id}`, { title: 'Nhà bà', baseRev: 3 }))
    assert.equal(renamed.item.title, 'Nhà bà')
    assert.deepEqual(body(await call(pro, 'GET', `/me/saved/${id}`)).item.payload, { kwh: '999' })
    assert.equal(body(await call(pro, 'PATCH', `/me/saved/${id}`, { title: 'x' })).code, 'INVALID_INPUT')
    assert.equal((await call(other, 'PATCH', `/me/saved/${id}`, { title: 'x', baseRev: 4 })).statusCode, 404)

    // Bookmarks are idempotent, one per tool, and cannot be edited.
    const star = body(await call(pro, 'PUT', '/me/saved/bookmarks/nen-pdf'))
    const again = body(await call(pro, 'PUT', '/me/saved/bookmarks/nen-pdf'))
    assert.equal(star.item.id, again.item.id)
    assert.equal(star.item.kind, 'bookmark')
    assert.equal((await call(pro, 'PUT', '/me/saved/bookmarks/khong-co')).statusCode, 400)
    assert.equal(body(await call(pro, 'PATCH', `/me/saved/${star.item.id}`, { title: 'x', baseRev: 1 })).code, 'INVALID_INPUT')
    assert.equal(body(await call(pro, 'GET', '/me/saved')).items.filter((item) => item.kind === 'bookmark').length, 1)
    assert.equal(body(await call(pro, 'DELETE', '/me/saved/bookmarks/nen-pdf')).ok, true)
    assert.equal(body(await call(pro, 'DELETE', '/me/saved/bookmarks/nen-pdf')).ok, true)
    assert.equal(body(await call(pro, 'GET', '/me/saved')).items.length, 1)

    // Quotas come from app_settings.
    await settings.set('cloud.maxItems', 10, 'qa')
    for (let index = 0; index < 10; index += 1) assert.equal((await save(other, { title: `Mục ${index}` })).statusCode, 201)
    const full = await save(other)
    assert.equal(full.statusCode, 409)
    assert.equal(body(full).code, 'CLOUD_QUOTA')
    assert.equal(body(await call(other, 'PUT', '/me/saved/bookmarks/nen-pdf')).code, 'CLOUD_QUOTA')
    await settings.set('cloud.maxItems', 500, 'qa')
    await settings.set('cloud.maxMegabytes', 1, 'qa')
    const big = { text: 'x'.repeat(250 * 1024) }
    for (let index = 0; index < 4; index += 1) assert.equal((await save(other, { payload: big })).statusCode, 201)
    assert.equal(body(await save(other, { payload: big })).code, 'CLOUD_QUOTA')
    const otherItems = body(await call(other, 'GET', '/me/saved')).items
    const small = otherItems.find((item) => item.size < 1000)
    assert.equal(body(await call(other, 'PATCH', `/me/saved/${small.id}`, { payload: big, baseRev: small.rev })).code, 'CLOUD_QUOTA')
    // Shrinking is always allowed, even over the cap.
    const large = otherItems.find((item) => item.size > 1000)
    assert.equal((await call(other, 'PATCH', `/me/saved/${large.id}`, { payload: { text: 'nhỏ' }, baseRev: large.rev })).statusCode, 200)

    // After Pro ends: read and delete only.
    await database.pool.execute('UPDATE user_plans SET ends_at = ? WHERE user_id = ?', [Math.floor(Date.now() / 1000) - 1, pro.id])
    const expired = body(await call(pro, 'GET', '/me/saved'))
    assert.equal(expired.writable, false)
    assert.equal(expired.items.length, 1)
    assert.equal(body(await call(pro, 'PATCH', `/me/saved/${id}`, { title: 'x', baseRev: 4 })).code, 'PRO_REQUIRED')
    assert.equal(body(await call(pro, 'PUT', '/me/saved/bookmarks/nen-pdf')).code, 'PRO_REQUIRED')
    assert.equal((await call(pro, 'DELETE', `/me/saved/${id}`, undefined, { trusted: false })).statusCode, 403)
    assert.equal(body(await call(pro, 'DELETE', `/me/saved/${id}`)).ok, true)
    assert.equal((await call(pro, 'DELETE', `/me/saved/${id}`)).statusCode, 404)

    // Source-check history: draft state per check, paged newest first, own checks only.
    const at = Math.floor(Date.now() / 1000)
    const sessionKey = `agent:cn-${pro.id}:ws:direct:${randomUUID()}`
    const draftOpen = randomUUID()
    const draftSent = randomUUID()
    const contributionId = randomUUID()
    const checks = []
    for (let index = 0; index < 33; index += 1) checks.push({ id: randomUUID(), at: at - index, draft: null })
    checks[0].draft = draftOpen
    checks[1].draft = draftSent
    checks[2].draft = randomUUID() // discarded: the draft row is gone
    for (const check of checks) {
      await database.pool.execute('INSERT INTO ai_source_checks (id, user_id, tool_id, base_snapshot_id, session_key, draft_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [check.id, pro.id, 'tien-dien', 'snap-1', sessionKey, check.draft, check.at])
    }
    // Two checks in one second still page without loss.
    await database.pool.execute('UPDATE ai_source_checks SET created_at = ? WHERE id IN (?, ?)', [at - 29, checks[29].id, checks[30].id])
    const draftInsert = 'INSERT INTO contribution_drafts (id, user_id, tool_id, domain, base_snapshot_id, proposed_changes, source_refs, uncertainties, created_by, submitted_contribution_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    await database.pool.execute(draftInsert, [draftOpen, pro.id, 'tien-dien', 'electricity', 'snap-1', '[]', '[]', '[]', 'agent', null, at])
    await database.pool.execute(draftInsert, [draftSent, pro.id, 'tien-dien', 'electricity', 'snap-1', '[]', '[]', '[]', 'agent', contributionId, at])
    await database.pool.execute("INSERT INTO contributions (id, receipt_hash, duplicate_hash, tool_id, domain, risk, proposed_changes, source_refs, status) VALUES (?, ?, ?, 'tien-dien', 'electricity', 'HIGH', '[]', '[]', 'NEEDS_REVIEW')",
      [contributionId, randomBytes(32).toString('hex'), randomBytes(32).toString('hex')])
    try {
      assert.equal((await call(null, 'GET', '/ai/history')).statusCode, 401)
      // Readable after Pro ended (pro's plan expired above).
      const page1 = body(await call(pro, 'GET', '/ai/history'))
      assert.equal(page1.items.length, 30)
      assert.deepEqual(page1.items.slice(0, 4).map((item) => item.draft), ['open', 'submitted', 'discarded', 'none'])
      assert.equal(page1.items[1].contributionId, contributionId)
      assert.equal(page1.items[1].contributionStatus, 'NEEDS_REVIEW')
      assert.equal(page1.items[0].contributionStatus, null)
      assert.equal(page1.items[0].baseSnapshotId, 'snap-1')
      assert.equal(page1.items[0].sessionKey, undefined)
      const page2 = body(await call(pro, 'GET', `/ai/history?before=${encodeURIComponent(page1.next)}`))
      assert.equal(page2.next, null)
      const seen = [...page1.items, ...page2.items].map((item) => item.id)
      assert.equal(new Set(seen).size, 33)
      assert.deepEqual(new Set(seen), new Set(checks.map((check) => check.id)))
      assert.equal(body(await call(pro, 'GET', '/ai/history?before=nope')).code, 'INVALID_INPUT')
      assert.deepEqual(body(await call(other, 'GET', '/ai/history')).items, [])
    } finally {
      await database.pool.execute('DELETE FROM contributions WHERE id = ?', [contributionId])
    }

    // Account deletion takes the saved items along.
    assert.ok(body(await call(other, 'GET', '/me/saved')).items.length > 0)
    await app.get(AccountDeletionService).delete(other.id, 'qa')
    const [left] = await database.pool.execute('SELECT COUNT(*) AS total FROM saved_items WHERE user_id = ?', [other.id])
    assert.equal(Number(left[0].total), 0)
  } finally {
    if (settings) {
      for (const key of ['cloud.maxItems', 'cloud.maxMegabytes']) await settings.reset(key)
      for (const { key, value } of savedSettings) await settings.set(key, value, 'qa-restore')
    }
    if (database) {
      for (const user of users) {
        for (const table of ['saved_items', 'ai_source_checks', 'contribution_drafts', 'user_sessions', 'user_plans']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
