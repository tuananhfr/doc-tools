process.env.CONFIG_FROM_ENV_ONLY = '1'
require('reflect-metadata')
require('dotenv/config')
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { Module, Global } = require('@nestjs/common')
const { NestFactory } = require('@nestjs/core')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { CodesModule } = require('../dist/codes/codes.module')
const { SettingsService } = require('../dist/settings/settings.service')
const { DatabaseService } = require('../dist/database/database.service')
class TestSettings {}
Global()(TestSettings)
Module({ providers: [{ provide: SettingsService, useValue: { get: async () => 10 } }], exports: [SettingsService] })(TestSettings)
class TestRoot {}
Module({ imports: [TestSettings, CodesModule] })(TestRoot)
let app, api, secondApp, secondApi, database
const ids = new Set(), actors = new Set()
const origin = (process.env.SITE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)[0]
  || new URL(process.env.SITE_PUBLIC_URL || 'https://lpc.vn/doc-tools').origin
const ip = '2001:db8:' + crypto.randomBytes(4).toString('hex').match(/.{4}/g).join(':') + '::1'
const headers = { 'x-cn-request': '1', origin }
const digest = value => crypto.createHash('sha256').update(value).digest('hex')
async function create(payload, actor = ip, target = api) {
  const hour = Math.floor(Date.now() / 3600000)
  actors.add(crypto.createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`code-create:${hour}:${actor}`).digest('hex'))
  const response = await target.inject({ method: 'POST', url: '/api/v1/codes', headers, payload, remoteAddress: actor })
  if (response.statusCode === 201) ids.add(response.json().id)
  return response
}
const resolve = code => api.inject({ url: new URL(code.resolve_url).pathname.replace(/^.*\/api\/v1/, '/api/v1') })
const revoke = (code, key = code.manage_key) => api.inject({ method: 'POST', url: `/api/v1/codes/${code.id}/revoke`, headers, payload: { manage_key: key } })
before(async () => {
  app = await NestFactory.create(TestRoot, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  await app.init()
  api = app.getHttpAdapter().getInstance()
  await api.ready()
  database = app.get(DatabaseService)
  secondApp = await NestFactory.create(TestRoot, createHttpAdapter(), { logger: false, bodyParser: false })
  secondApp.setGlobalPrefix('api/v1'); await secondApp.init()
  secondApi = secondApp.getHttpAdapter().getInstance(); await secondApi.ready()
})
after(async () => {
  if (database) {
    for (const id of ids) await database.pool.execute('DELETE FROM code_links WHERE id = ?', [id])
    for (const actor of actors) await database.pool.execute('DELETE FROM code_request_limits WHERE actor_hash = ?', [actor])
  }
  if (secondApp) await secondApp.close()
  if (app) await app.close()
})
test('guest QR creates an exact redirect and isolates management credentials', async () => {
  const destination = 'https://example.com/nhan?x=a%20b&unicode=%C4%91#part'
  const response = await create({ destination_url: destination, expires_at: null })
  assert.equal(response.statusCode, 201, response.body)
  assert.equal(response.headers['cache-control'], 'no-store')
  const code = response.json()
  assert.match(code.manage_key, /^[A-Za-z0-9_-]{43}$/)
  assert.ok(!code.resolve_url.includes(code.manage_key))
  const scanned = await resolve(code)
  assert.equal(scanned.statusCode, 302, scanned.body)
  assert.equal(scanned.headers.location, destination)
  assert.equal(scanned.headers['referrer-policy'], 'no-referrer')
  assert.ok(!scanned.body.includes(code.manage_key))
  const [rows] = await database.pool.execute('SELECT * FROM code_links WHERE id = ?', [code.id])
  assert.equal(rows[0].manage_key_hash, digest(code.manage_key))
  assert.ok(!JSON.stringify(rows).includes(code.manage_key))
  assert.equal((await revoke(code, 'z'.repeat(43))).statusCode, 404)
  assert.equal((await resolve(code)).statusCode, 302)
  assert.equal((await revoke(code)).statusCode, 200)
  assert.equal((await revoke(code)).statusCode, 200)
  const inactive = await resolve(code)
  assert.equal(inactive.statusCode, 410)
  assert.ok(!inactive.headers.location)
})
test('expiry is enforced at read without jobs and public unknown IDs reveal no secret', async () => {
  const response = await create({ destination_url: 'https://example.com', expires_at: new Date(Date.now() + 60000).toISOString() })
  assert.equal(response.statusCode, 201)
  const code = response.json()
  assert.equal((await resolve(code)).statusCode, 302)
  await database.pool.execute('UPDATE code_links SET expires_at = ? WHERE id = ?', [Date.now() - 1, code.id])
  assert.equal((await resolve(code)).statusCode, 410)
  assert.equal((await api.inject({ url: '/api/v1/codes/' + 'z'.repeat(32) + '/resolve' })).statusCode, 404)
})
test('writes reject unsafe input, untrusted origins and oversize bodies', async () => {
  for (const destination_url of ['http://example.com', 'https://localhost/', 'https://127.0.0.1', 'https://[::1]', 'https://10.1.2.3', 'https://0x7f000001', 'https://a.internal', 'https://u:p@example.com', 'javascript:alert(1)', 'https://example.com:8443', 'https://example.com/\r\nLocation:x']) {
    const response = await create({ destination_url })
    assert.equal(response.statusCode, 400, destination_url + ': ' + response.body)
  }
  for (const payload of [null, [], {}, { destination_url: 'https://example.com', extra: true }, { destination_url: 'https://example.com', expires_at: '2020-01-01T00:00:00Z' }, { destination_url: 'https://example.com', expires_at: '2099-02-30T00:00:00Z' }])
    assert.equal((await create(payload)).statusCode, 400)
  assert.equal((await api.inject({ method: 'POST', url: '/api/v1/codes', payload: { destination_url: 'https://example.com' } })).statusCode, 403)
  const badOrigin = process.env.SITE_ORIGINS
  process.env.SITE_ORIGINS = origin
  try {
    assert.equal((await api.inject({ method: 'POST', url: '/api/v1/codes', headers: { ...headers, origin: 'https://untrusted.invalid' }, payload: { destination_url: 'https://example.com' } })).statusCode, 403)
  } finally { if (badOrigin === undefined) delete process.env.SITE_ORIGINS; else process.env.SITE_ORIGINS = badOrigin }
  assert.equal((await api.inject({ method: 'POST', url: '/api/v1/codes', headers, payload: { destination_url: 'https://example.com/' + 'a'.repeat(2100) } })).statusCode, 413)
  assert.equal((await create({ destination_url: 'https://example.com/' + 'a'.repeat(1200) })).statusCode, 201)
})
test('concurrent creates share a database-backed budget across instances', async () => {
  const actor = ip.replace('::1', '::2')
  const responses = await Promise.all(Array.from({ length: 16 }, (_, index) => create({ destination_url: 'https://example.com/rate' }, actor, index % 2 ? secondApi : api)))
  assert.equal(responses.filter(r => r.statusCode === 201).length, 10)
  assert.equal(responses.filter(r => r.statusCode === 429).length, 6)
  for (const response of responses) assert.ok([201, 429].includes(response.statusCode), response.body)
})
