// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, randomBytes, randomUUID } = require('node:crypto')
// Must be set before configuration() is first read; dotenv never overrides existing variables.
process.env.SITE_ORIGINS = 'https://site.test'
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')

const tag = randomBytes(5).toString('hex')

test('legal sources: staff gate, validation, public view, audit', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const ids = [`qa-src-${tag}`, `qa-draft-${tag}`]
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)

    async function person(name, role = null) {
      const id = randomUUID()
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-sources-${name}-${tag}@example.test`])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const token = randomBytes(32).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const trusted = { 'x-cn-request': '1', origin: 'https://site.test' }
    const call = (user, method, url, payload, headers = trusted) => api.inject({
      method, url: `/api/v1${url}`, payload,
      headers: { ...(user ? { cookie: user.cookie } : {}), ...headers, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    })

    const admin = await person('admin', 'admin')
    const reviewer = await person('reviewer', 'reviewer')
    const plain = await person('plain')
    const valid = {
      sourceId: ids[0], issuer: 'Bộ Công Thương', documentNumber: 'QA-01/2025/TT-BCT', jurisdiction: 'Toàn quốc',
      article: 'Điều 6', validFrom: '2025-05-10', validTo: null, checkedAt: '2026-01-05', reviewer: 'QA Legal',
      evidenceUrl: 'https://example.com/qa-evidence.pdf', status: 'verified',
    }

    // Gates.
    assert.equal((await call(admin, 'POST', '/admin/sources', valid, {})).statusCode, 403, 'untrusted write')
    assert.equal((await call(null, 'GET', '/admin/sources')).statusCode, 401)
    assert.equal((await call(plain, 'GET', '/admin/sources')).json().code, 'NOT_STAFF')
    assert.equal((await call(reviewer, 'GET', '/admin/sources')).json().code, 'FORBIDDEN')

    // Validation names the field.
    const bad = async (patch, field) => {
      const response = await call(admin, 'POST', '/admin/sources', { ...valid, ...patch })
      assert.equal(response.statusCode, 400, `${field} must be rejected`)
      assert.equal(response.json().field, field)
    }
    await bad({ sourceId: 'Bad Id' }, 'sourceId')
    await bad({ issuer: 'x' }, 'issuer')
    await bad({ checkedAt: '2999-01-01' }, 'checkedAt')
    await bad({ checkedAt: '2026-02-30' }, 'checkedAt')
    await bad({ validFrom: '2026-01-01', validTo: '2025-01-01' }, 'validTo')
    await bad({ evidenceUrl: 'http://example.com/a' }, 'evidenceUrl')
    await bad({ evidenceUrl: 'https://127.0.0.1/a' }, 'evidenceUrl')
    await bad({ evidenceUrl: 'https://user:pw@example.com/a' }, 'evidenceUrl')
    await bad({ status: 'approved' }, 'status')
    await bad({ surprise: 1 }, 'surprise')

    // Create, conflict, update.
    const created = await call(admin, 'POST', '/admin/sources', valid)
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().source.reviewer, 'QA Legal')
    assert.equal((await call(admin, 'POST', '/admin/sources', valid)).json().code, 'SOURCE_EXISTS')
    const { sourceId: _id, ...fields } = valid
    const updated = await call(admin, 'PUT', `/admin/sources/${ids[0]}`, { ...fields, status: 'superseded' })
    assert.equal(updated.statusCode, 200)
    assert.equal(updated.json().source.status, 'superseded')
    assert.equal((await call(admin, 'PUT', `/admin/sources/qa-missing-${tag}`, fields)).statusCode, 404)
    assert.equal((await call(admin, 'POST', '/admin/sources', { ...valid, sourceId: ids[1], status: 'draft' })).statusCode, 201)
    assert.ok((await call(admin, 'GET', '/admin/sources')).json().items.some(item => item.sourceId === ids[1]))

    // Public view: no drafts, no reviewer, carries staleDays.
    const publicOne = await api.inject({ method: 'GET', url: `/api/v1/sources/${ids[0]}` })
    assert.equal(publicOne.statusCode, 200)
    assert.equal(publicOne.headers['cache-control'], 'no-store')
    const body = publicOne.json()
    assert.equal(body.source.documentNumber, 'QA-01/2025/TT-BCT')
    assert.equal(body.source.checkedAt, '2026-01-05')
    assert.equal(body.source.validTo, null)
    assert.equal('reviewer' in body.source, false)
    assert.equal('createdBy' in body.source, false)
    assert.equal(body.staleDays, 90)
    assert.equal((await api.inject({ method: 'GET', url: `/api/v1/sources/${ids[1]}` })).json().code, 'SOURCE_NOT_FOUND')
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/sources/NOT_AN_ID' })).statusCode, 404)

    const [audit] = await database.pool.execute('SELECT action FROM admin_audit WHERE target_type = ? AND target_id IN (?, ?) ORDER BY id', ['source', ids[0], ids[1]])
    assert.deepEqual(audit.map(row => row.action), ['SOURCE_CREATED', 'SOURCE_UPDATED', 'SOURCE_CREATED'])
  } finally {
    if (database) {
      for (const id of ids) {
        await database.pool.execute('DELETE FROM legal_sources WHERE source_id = ?', [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE target_type = ? AND target_id = ?', ['source', id])
      }
      for (const user of users) {
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [user.id])
        await database.pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [user.id])
        await database.pool.execute('DELETE FROM user_roles WHERE user_id = ?', [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
