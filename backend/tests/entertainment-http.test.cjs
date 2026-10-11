process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac, randomBytes } = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { EntertainmentModule } = require('../dist/entertainment/entertainment.module')
const { DatabaseService } = require('../dist/database/database.service')
const { createHttpAdapter } = require('../dist/config/http-adapter')

test('guest entertainment HTTP and MySQL contracts', async t => {
  const app = await NestFactory.create(EntertainmentModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const ip = `198.19.${randomBytes(1)[0]}.${randomBytes(1)[0]}`
  const digest = value => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`ent:${value}`).digest('hex')
  const keys = []
  const key = (age = 0) => { const value = `${(Date.now() - age).toString(36)}_${randomBytes(16).toString('hex')}`; keys.push(value); return value }
  let database
  const old = process.env.ENT_SANDBOX_ENABLED
  try {
    await app.init(); const api = app.getHttpAdapter().getInstance(); await api.ready()
    database = app.get(DatabaseService)
    const request = (path, payload, drawKey, trusted = true) => api.inject({ method: payload === undefined ? 'GET' : 'POST', url: `/api/v1/ent/${path}`, payload, remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip, ...(trusted ? { 'x-cn-request': '1' } : {}), ...(drawKey ? { 'idempotency-key': drawKey } : {}) } })
    const settings = { spread: 3, reversed: false }
    const input = { birth_date: '2000-02-29', name: 'Đặng Thị Ánh', personal_year: 2026 }
    await t.test('tools and execution are available without an opt-in flag', async () => {
      delete process.env.ENT_SANDBOX_ENABLED
      const state = await request('tools')
      assert.ok(state.json().tools.every(tool => tool.available === true))
      assert.equal('sandbox_enabled' in state.json(), false)
      assert.equal(state.json().sources[0].corpus_available, false)
      assert.equal((await request('cards/draw', settings, key())).statusCode, 200)
      process.env.ENT_SANDBOX_ENABLED = '0'
      assert.equal((await request('cards/draw', settings, key())).statusCode, 200)
    })
    await t.test('write guard and route body limit reject unsafe requests', async () => {
      assert.equal((await request('cards/draw', settings, key(), false)).statusCode, 403)
      assert.equal((await request('numerology/calculate', { ...input, name: 'x'.repeat(2100) })).statusCode, 413)
      assert.equal((await request('tarot/draw', { spread: 6, reversed: false }, key())).statusCode, 400)
    })
    await t.test('guest calculation has provenance and no account requirement', async () => {
      const response = await request('numerology/calculate', input)
      assert.equal(response.statusCode, 200, response.payload)
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.equal(response.json().result.normalized_name, 'DANGTHIANH')
      assert.equal('verification_level' in response.json(), false)
      assert.equal('public_release' in response.json(), false)
      assert.equal(response.json().disclaimer_id, 'cn-ent-reference-v1')
      assert.equal((await request('numerology/calculate', { ...input, birth_date: '1900-02-29' })).statusCode, 422)
    })
    let drawKey, snapshot
    await t.test('same key and concurrent retries return one immutable draw', async () => {
      drawKey = key()
      const replies = await Promise.all(Array.from({ length: 6 }, () => request('tarot/draw', { spread: 10, reversed: true }, drawKey)))
      assert.ok(replies.every(reply => reply.statusCode === 200), replies.map(reply => reply.payload).join('\n'))
      snapshot = replies[0].json()
      for (const reply of replies) assert.deepEqual(reply.json(), snapshot)
      assert.equal(new Set(snapshot.result.cards.map(card => card.id)).size, 10)
      assert.deepEqual((await request('tarot/draw', { spread: 10, reversed: true }, drawKey)).json(), snapshot)
      const [rows] = await database.pool.execute('SELECT snapshot FROM ent_draw_sessions WHERE key_hash = ?', [digest(drawKey)])
      assert.equal(rows.length, 1)
      assert.equal(JSON.stringify(rows).includes('DANGTHIANH'), false)
      assert.equal(JSON.stringify(rows).includes(input.birth_date), false)
    })
    await t.test('configuration or deck changes cannot reuse a draw key', async () => {
      for (const [path, body] of [['tarot/draw', { spread: 3, reversed: true }], ['cards/draw', settings]]) {
        const response = await request(path, body, drawKey)
        assert.equal(response.statusCode, 409, response.payload)
        assert.equal(response.json().code, 'IDEMPOTENCY_CONFLICT')
      }
    })
    await t.test('report lookup is idempotent and never creates another draw', async () => {
      for (let i = 0; i < 3; i++) assert.deepEqual((await request('reports', { draw_key: drawKey })).json(), snapshot)
      assert.equal((await request('reports', { draw_key: key() })).statusCode, 404)
    })
    await t.test('legacy snapshots keep the same cards and request identity', async () => {
      const legacy = { ...snapshot, verification_level: 'TECHNICAL_SANDBOX', public_release: 'BLOCKED' }
      await database.pool.execute('UPDATE ent_draw_sessions SET snapshot = ? WHERE key_hash = ?', [JSON.stringify(legacy), digest(drawKey)])
      assert.deepEqual((await request('reports', { draw_key: drawKey })).json(), snapshot)
      assert.deepEqual((await request('tarot/draw', { spread: 10, reversed: true }, drawKey)).json(), snapshot)
    })
    await t.test('expired keys reject both draw and report even without stored rows', async () => {
      const expired = key(3600_001)
      for (const [path, body, header] of [['cards/draw', settings, expired], ['reports', { draw_key: expired }, undefined]]) {
        const response = await request(path, body, header)
        assert.equal(response.statusCode, 410)
        assert.equal(response.json().code, 'SESSION_EXPIRED')
      }
    })
    await t.test('calendar returns UTC+7 conversion and blocks unapproved folk rules', async () => {
      const response = await request('almanac/day?date=2024-02-10')
      assert.equal(response.statusCode, 200, response.payload)
      assert.equal(response.json().result.lunar.day, 1)
      assert.equal(response.json().result.lunar.month, 1)
      assert.equal(response.json().result.folk_rules.status, 'BLOCKED')
      assert.equal((await request('almanac/day?date=1900-02-29')).statusCode, 422)
    })
    await t.test('per-IP limiter returns 429 while canonical draw retries still work', async () => {
      let status = 0
      for (let i = 0; i < 35 && status !== 429; i++) status = (await request('numerology/calculate', input)).statusCode
      assert.equal(status, 429)
      assert.deepEqual((await request('tarot/draw', { spread: 10, reversed: true }, drawKey)).json(), snapshot)
    })
  } finally {
    if (old === undefined) delete process.env.ENT_SANDBOX_ENABLED; else process.env.ENT_SANDBOX_ENABLED = old
    if (database) {
      for (const value of keys) await database.pool.execute('DELETE FROM ent_draw_sessions WHERE key_hash = ?', [digest(value)])
      await database.pool.execute('DELETE FROM ent_request_limits WHERE actor_hash = ?', [digest(ip)])
    }
    await app.close()
  }
})
