// POST /read/extract end to end: flag, CSRF guard, SSRF policy, robots, paywall, size, rate limit.
// MySQL from .env (budget table); no Internet: the fake resolver + dial seam point vetted addresses at a local HTTPS server.
process.env.CONFIG_FROM_ENV_ONLY = '1'
require('reflect-metadata')
require('dotenv/config')
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { makeTestTls } = require('./helpers/test-tls.cjs')
const crypto = require('node:crypto')
const https = require('node:https')
const { Module, Global } = require('@nestjs/common')
const { NestFactory } = require('@nestjs/core')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseModule } = require('../dist/database/database.module')
const { DatabaseService } = require('../dist/database/database.service')
const { SettingsService } = require('../dist/settings/settings.service')
const { TrustedWriteGuard } = require('../dist/session/trusted-write.guard')
const { ReadController } = require('../dist/read/read.controller')
const { ReadService } = require('../dist/read/read.service')
const { ReadLimitRepository } = require('../dist/read/read-limit.repository')
const { ReadNetwork } = require('../dist/read/read-network')

const tls = makeTestTls()
const PUBLIC = '93.184.216.34'
const settings = { 'read.linkEnabled': true, 'read.guestHourly': 50 }
const routes = new Map()
const internalHits = []
let server, internal, app, api, database
const actors = new Set()

const DNS = {
  'news.example.com': [PUBLIC], 'blocked.example.com': [PUBLIC], 'paid.example.com': [PUBLIC], 'down.example.com': [PUBLIC],
  'hop.example.com': [PUBLIC], 'mixed.example.com': [PUBLIC, '10.0.0.7'], 'admin.example.com': ['192.168.1.1'],
}
const network = {
  resolve: async (host) => { if (!DNS[host]) throw new Error('ENOTFOUND'); return DNS[host] },
  dial: (address) => (address === PUBLIC ? { address: '127.0.0.1', port: server.address().port } : { address: '127.0.0.1', port: internal.address().port }),
  ca: tls.cert.toString(),
}
class TestSettings {}
Global()(TestSettings)
Module({ providers: [{ provide: SettingsService, useValue: { get: async (key) => settings[key] } }], exports: [SettingsService] })(TestSettings)
class TestRead {}
Module({ imports: [DatabaseModule], controllers: [ReadController], providers: [ReadService, ReadLimitRepository, TrustedWriteGuard, { provide: ReadNetwork, useValue: network }] })(TestRead)
class TestRoot {}
Module({ imports: [TestSettings, TestRead] })(TestRoot)

const origin = (process.env.SITE_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)[0]
  || new URL(process.env.SITE_PUBLIC_URL || 'https://lpc.vn/doc-tools').origin
const headers = { 'x-cn-request': '1', origin }
const clientIp = '2001:db8:' + crypto.randomBytes(4).toString('hex').match(/.{4}/g).join(':') + '::9'
function extract(url, ip = clientIp, extraHeaders = headers) {
  const hour = Math.floor(Date.now() / 3600000)
  actors.add(crypto.createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`read-extract:${hour}:${ip}`).digest('hex'))
  return api.inject({ method: 'POST', url: '/api/v1/read/extract', headers: extraHeaders, payload: { url }, remoteAddress: ip })
}
const page = (body, type = 'text/html; charset=utf-8') => (_req, res) => { res.writeHead(200, { 'content-type': type }); res.end(body) }
const ARTICLE = '<html><head><title>Bài thử</title></head><body><nav>Menu</nav><article><h1>Bài thử</h1>'
  + '<p>Đoạn thứ nhất của bài viết thử nghiệm, đủ dài để được coi là nội dung chính của trang.</p>'
  + '<p>Đoạn thứ hai tiếp tục câu chuyện với nhiều chữ hơn nữa để vượt ngưỡng hai trăm ký tự tối thiểu.</p>'
  + '<p>Đoạn thứ ba kết thúc bài viết, cảm ơn bạn đã đọc tới đây và chúc một ngày tốt lành.</p></article></body></html>'

before(async () => {
  const listen = (handler) => new Promise((resolve) => { const s = https.createServer(tls, handler); s.listen(0, '127.0.0.1', () => resolve(s)) })
  server = await listen((req, res) => {
    const route = routes.get(`${req.headers.host}${req.url}`)
    if (route) return route(req, res)
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end()
  })
  internal = await listen((req, res) => { internalHits.push(req.url); res.end(ARTICLE) })
  routes.set('news.example.com/robots.txt', page('User-agent: *\nDisallow: /private', 'text/plain'))
  routes.set('news.example.com/bai-viet', page(ARTICLE))
  routes.set('news.example.com/private/x', page(ARTICLE))
  routes.set('news.example.com/rong', page('<nav><a>Trang chủ</a></nav><p>Ngắn</p>'))
  routes.set('news.example.com/pdf', page('%PDF-1.7', 'application/pdf'))
  routes.set('news.example.com/lon', page('<p>' + 'a'.repeat(2 * 1024 * 1024 + 10) + '</p>'))
  routes.set('news.example.com/sang-noi-bo', (_req, res) => { res.writeHead(302, { location: 'https://127.0.0.1/' }); res.end() })
  routes.set('news.example.com/sang-admin', (_req, res) => { res.writeHead(301, { location: 'https://admin.example.com/' }); res.end() })
  routes.set('news.example.com/sang-hop', (_req, res) => { res.writeHead(302, { location: 'https://hop.example.com/bai' }); res.end() })
  routes.set('hop.example.com/robots.txt', page('User-agent: ChuyenNhoReader\nDisallow: /', 'text/plain'))
  routes.set('hop.example.com/bai', page(ARTICLE))
  routes.set('blocked.example.com/robots.txt', page('User-agent: *\nDisallow: /', 'text/plain'))
  routes.set('blocked.example.com/bai', page(ARTICLE))
  routes.set('down.example.com/robots.txt', (_req, res) => { res.writeHead(503); res.end() })
  routes.set('down.example.com/bai', page(ARTICLE))
  routes.set('paid.example.com/ld', page(ARTICLE.replace('<head>', '<head><script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false}</script>')))
  routes.set('paid.example.com/402', (_req, res) => { res.writeHead(402, { 'content-type': 'text/html' }); res.end('pay') })
  app = await NestFactory.create(TestRoot, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  await app.init()
  api = app.getHttpAdapter().getInstance()
  await api.ready()
  database = app.get(DatabaseService)
})
after(async () => {
  if (database) for (const actor of actors) await database.pool.execute('DELETE FROM read_request_limits WHERE actor_hash = ?', [actor])
  if (app) await app.close()
  server?.close(); internal?.close()
})

test('config reports the flag and extraction is off unless it is on', async () => {
  settings['read.linkEnabled'] = false
  try {
    const config = await api.inject({ url: '/api/v1/read/config' })
    assert.equal(config.statusCode, 200)
    assert.deepEqual(config.json(), { ok: true, linkEnabled: false })
    assert.equal(config.headers['cache-control'], 'no-store')
    const off = await extract('https://news.example.com/bai-viet')
    assert.equal(off.statusCode, 404)
    assert.equal(off.json().code, 'READ_DISABLED')
  } finally { settings['read.linkEnabled'] = true }
  assert.equal((await api.inject({ url: '/api/v1/read/config' })).json().linkEnabled, true)
})

test('READ01: a public HTTPS article comes back as ordered segments, nothing stored', async () => {
  const response = await extract('https://news.example.com/bai-viet#doan-2')
  assert.equal(response.statusCode, 200, response.body)
  assert.equal(response.headers['cache-control'], 'no-store')
  const body = response.json()
  assert.equal(body.ok, true)
  assert.equal(body.document.title, 'Bài thử')
  assert.equal(body.document.sourceUrl, 'https://news.example.com/bai-viet')
  assert.ok(!Number.isNaN(Date.parse(body.document.checkedAt)))
  assert.deepEqual(body.document.segments.map((s) => s.kind), ['heading', 'paragraph', 'paragraph', 'paragraph'])
  assert.ok(!JSON.stringify(body).includes('Menu'))
  assert.deepEqual(body.warnings, [])
})

test('READ02 / SEC01: local, private, metadata and rebinding targets are refused without a request', async () => {
  for (const url of ['https://localhost/', 'https://127.0.0.1/', 'https://2130706433/', 'https://0177.0.0.1/', 'https://10.0.0.1/', 'https://172.16.5.4/',
    'https://192.168.1.1/', 'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://[fd00::1]/', 'https://[::ffff:127.0.0.1]/',
    'https://mixed.example.com/', 'https://admin.example.com/', 'https://news.example.com/sang-noi-bo', 'https://news.example.com/sang-admin', 'https://khong-ton-tai.example.com/']) {
    const response = await extract(url)
    assert.equal(response.statusCode, 422, `${url}: ${response.body}`)
    assert.equal(response.json().code, 'UNSUPPORTED', url)
  }
  for (const url of ['http://news.example.com/bai-viet', 'file:///etc/passwd', 'gopher://x', '', 'https://']) {
    const response = await extract(url)
    assert.equal(response.statusCode, 400, `${url}: ${response.body}`)
    assert.equal(response.json().code, 'READ_INPUT_INVALID')
  }
  assert.deepEqual(internalHits, [])
})

test('READ03: robots.txt and paywalls are respected, never bypassed', async () => {
  assert.equal((await extract('https://blocked.example.com/bai')).json().code, 'ROBOTS_DENIED')
  assert.equal((await extract('https://news.example.com/private/x')).json().code, 'ROBOTS_DENIED')
  assert.equal((await extract('https://down.example.com/bai')).json().code, 'ROBOTS_DENIED')
  assert.equal((await extract('https://news.example.com/sang-hop')).json().code, 'ROBOTS_DENIED')
  const paid = await extract('https://paid.example.com/ld')
  assert.equal(paid.statusCode, 422)
  assert.equal(paid.json().code, 'PAYWALL')
  assert.ok(!paid.body.includes('Đoạn thứ nhất'))
  assert.equal((await extract('https://paid.example.com/402')).json().code, 'PAYWALL')
})

test('size, type and empty pages map to their reader codes', async () => {
  assert.equal((await extract('https://news.example.com/lon')).json().code, 'TOO_LARGE')
  assert.equal((await extract('https://news.example.com/pdf')).json().code, 'UNSUPPORTED')
  assert.equal((await extract('https://news.example.com/rong')).json().code, 'NO_ARTICLE')
})

test('writes need the trusted header, a small JSON body and stay within the hourly budget', async () => {
  assert.equal((await extract('https://news.example.com/bai-viet', clientIp, {})).statusCode, 403)
  const oversize = await api.inject({ method: 'POST', url: '/api/v1/read/extract', headers, payload: { url: 'https://news.example.com/' + 'a'.repeat(5000) } })
  assert.equal(oversize.statusCode, 413)
  assert.equal((await api.inject({ method: 'POST', url: '/api/v1/read/extract', headers, payload: { url: 'https://news.example.com/bai-viet', extra: 1 } })).statusCode, 400)
  settings['read.guestHourly'] = 3
  try {
    const ip = clientIp.replace('::9', '::a')
    const codes = []
    for (let i = 0; i < 5; i++) codes.push((await extract('https://news.example.com/bai-viet', ip)).statusCode)
    assert.deepEqual(codes, [200, 200, 200, 429, 429])
    assert.equal((await extract('https://news.example.com/bai-viet', ip)).json().code, 'READ_RATE_LIMITED')
  } finally { settings['read.guestHourly'] = 50 }
})
