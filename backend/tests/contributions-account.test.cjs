// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
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
const { ContributionsRepository } = require('../dist/contributions/contributions.repository')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')

async function signedInUser(database, tag) {
  const id = randomUUID()
  const token = randomBytes(32).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-${tag}-${randomBytes(6).toString('hex')}@example.test`])
  await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
  return { id, cookie: `cn_session=${token}` }
}

test('signed-in contributions are attributed, listed to their owner and accept evidence', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const toolId = `qa-${randomBytes(8).toString('hex')}`
  const ip = `192.0.2.${(randomBytes(1)[0] % 250) + 1}`
  const users = []
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const owner = await signedInUser(database, 'owner'); users.push(owner)
    const stranger = await signedInUser(database, 'stranger'); users.push(stranger)
    const site = (user) => ({ cookie: user.cookie, 'x-cn-request': '1', origin: 'https://site.test', 'x-forwarded-for': ip })
    const send = (payload, headers) => api.inject({ method: 'POST', url: '/api/v1/contributions', payload, remoteAddress: '127.0.0.1', headers })
    const change = (after) => ({ toolId, domain: 'electricity', baseSnapshotId: null, proposedChanges: [{ field: 'tier.1', before: '100', after }], sourceRefs: [], jurisdiction: 'VN' })
    const submitterOf = async (receiptCode) => {
      const [rows] = await database.pool.execute('SELECT c.id, s.user_id AS submitted_by, s.attribution_consent FROM contributions c LEFT JOIN contribution_submitters s ON s.contribution_id = c.id WHERE c.receipt_hash = ?', [createHash('sha256').update(receiptCode).digest('hex')])
      return rows[0]
    }

    const cookieOnly = await send(change('101'), { cookie: owner.cookie, 'x-forwarded-for': ip })
    assert.equal(cookieOnly.statusCode, 200, cookieOnly.payload)
    assert.equal(cookieOnly.json().tracked, false, 'a bare cookie never attributes')
    assert.equal((await submitterOf(cookieOnly.json().receiptCode)).submitted_by, null)
    assert.equal((await send(change('102'), { ...site(owner), origin: 'https://evil.test' })).json().tracked, false, 'foreign origin falls back to guest')

    const attributed = await send({ ...change('103'), attribution: true }, site(owner))
    assert.deepEqual({ ...attributed.json(), receiptCode: undefined }, { ok: true, receiptCode: undefined, status: 'NEEDS_SOURCE', tracked: true })
    const row = await submitterOf(attributed.json().receiptCode)
    assert.equal(row.submitted_by, owner.id)
    assert.equal(row.attribution_consent, 1)
    const [audit] = await database.pool.execute('SELECT actor FROM contribution_audit WHERE contribution_id = ?', [row.id])
    assert.equal(audit[0].actor, `user:${owner.id}`)
    const unattributed = await send({ ...change('104'), attribution: 'yes' }, site(owner))
    assert.equal((await submitterOf(unattributed.json().receiptCode)).attribution_consent, 0, 'only literal true consents')

    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me/contributions' })).statusCode, 401)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me/contributions?page=0', headers: { cookie: owner.cookie } })).statusCode, 400)
    const list = (await api.inject({ method: 'GET', url: '/api/v1/me/contributions', headers: { cookie: owner.cookie } })).json()
    assert.equal(list.total, 2)
    assert.equal(list.pageSize, 20)
    // Both rows share one second of created_at, so their relative order is only the id tiebreak.
    assert.deepEqual(list.items.map((item) => item.changes[0].after).sort(), ['103', '104'], 'guest-filed ones excluded')
    const listed = list.items.find((item) => item.id === row.id)
    assert.deepEqual(listed, { id: row.id, toolId, domain: 'electricity', status: 'NEEDS_SOURCE', sourceRefs: [], attribution: true, createdAt: listed.createdAt, changes: [{ field: 'tier.1', before: '100', after: '103' }], changeCount: 1, canAddEvidence: true })
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me/contributions', headers: { cookie: stranger.cookie } })).json().total, 0)

    const evidence = (user, id, sourceRefs, headers = site(user)) => api.inject({ method: 'POST', url: `/api/v1/me/contributions/${id}/evidence`, payload: { sourceRefs }, remoteAddress: '127.0.0.1', headers })
    const official = (n) => ({ url: `https://example.com/official-${n}`, type: 'OFFICIAL_WEB' })
    assert.equal((await evidence(owner, row.id, [official(1)], { cookie: owner.cookie })).statusCode, 403, 'evidence needs the site header')
    assert.equal((await evidence(stranger, row.id, [official(1)])).statusCode, 404, 'another user sees no such contribution')
    assert.equal((await evidence(owner, row.id, [{ url: 'http://localhost/x', type: 'OTHER' }])).statusCode, 400)
    assert.equal((await evidence(owner, 'not-a-uuid', [official(1)])).statusCode, 400)
    const added = await evidence(owner, row.id, [official(1), official(1)])
    assert.deepEqual(added.json(), { ok: true, status: 'NEEDS_REVIEW', sourceRefs: [official(1)] })
    const appended = await evidence(owner, row.id, [official(1), official(2)])
    assert.deepEqual(appended.json().sourceRefs, [official(1), official(2)], 'appends, ignoring sources already there')
    const tooMany = await evidence(owner, row.id, Array.from({ length: 9 }, (_, n) => official(n + 3)))
    assert.equal(tooMany.json().code, 'TOO_MANY_SOURCES')

    const repository = app.get(ContributionsRepository)
    await repository.transition(row.id, 'reject', 'qa-reviewer', 'Không đủ căn cứ để đổi.', null)
    assert.equal((await evidence(owner, row.id, [official(20)])).json().code, 'EVIDENCE_CLOSED')
    const closed = (await api.inject({ method: 'GET', url: '/api/v1/me/contributions', headers: { cookie: owner.cookie } })).json().items.find((item) => item.id === row.id)
    assert.equal(closed.status, 'REJECTED')
    assert.equal(closed.canAddEvidence, false)

    const idea = (text, attribution) => send({ toolId, domain: 'ideas', baseSnapshotId: null, proposedChanges: [{ field: 'idea', before: '', after: text }], sourceRefs: [], jurisdiction: null, attribution }, site(owner))
    const publish = async (receiptCode) => {
      const { id } = await submitterOf(receiptCode)
      await repository.transition(id, 'verify', 'qa-a', 'Ý tưởng rõ ràng, hữu ích.', null)
      await repository.transition(id, 'approve', 'qa-b', null, null)
      await repository.transition(id, 'publish', 'qa-c', null, null)
      return id
    }
    const namedIdea = await publish((await idea(`Ý tưởng có tên ${toolId}`, true)).json().receiptCode)
    const quietIdea = await publish((await idea(`Ý tưởng ẩn tên ${toolId}`, false)).json().receiptCode)
    const authors = async () => Object.fromEntries((await api.inject({ method: 'GET', url: '/api/v1/contributions/ideas' })).json().ideas.filter((item) => [namedIdea, quietIdea].includes(item.id)).map((item) => [item.id, item.author]))
    assert.deepEqual(await authors(), { [namedIdea]: null, [quietIdea]: null }, 'no name until the profile is public')
    await database.pool.execute('UPDATE users SET display_name = ?, public_attribution = 1 WHERE id = ?', ['Người Thử', owner.id])
    assert.deepEqual(await authors(), { [namedIdea]: 'Người Thử', [quietIdea]: null })
    await database.pool.execute('UPDATE users SET public_attribution = 0 WHERE id = ?', [owner.id])
    assert.deepEqual(await authors(), { [namedIdea]: null, [quietIdea]: null }, 'turning attribution off hides past names')

    for (let index = 1; index <= 11; index++) {
      const response = await send(change(`stranger-${index}`), { ...site(stranger), 'x-forwarded-for': `192.0.2.${index}` })
      assert.equal(response.statusCode, index <= 10 ? 200 : 429, `account limit follows the user across IPs (#${index}) ${response.payload}`)
    }
  } finally {
    if (database) {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const row of rows) {
        await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [row.id])
        await database.pool.execute('DELETE FROM contribution_submitters WHERE contribution_id = ?', [row.id])
      }
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      const keys = [hmac(`contribution:${ip}`), ...users.map((user) => hmac(`contribution-user:${user.id}`))]
      for (const key of keys) {
        await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [key])
        await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [key])
      }
      for (const user of users) {
        await database.pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
