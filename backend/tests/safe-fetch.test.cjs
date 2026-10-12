// Safe fetcher. No database and no Internet: names resolve through a fake resolver,
// vetted public addresses are dialled to a local HTTPS server whose *.example.com certificate is made per run (helpers/test-tls.cjs).
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { makeTestTls } = require('./helpers/test-tls.cjs')
const https = require('node:https')
const zlib = require('node:zlib')
const { isBlockedAddress } = require('../dist/net/ip-policy')
const { safeFetch, parsePublicUrl, SafeFetchError } = require('../dist/net/safe-fetch')

const tls = makeTestTls()
const PUBLIC = '93.184.216.34'
const PRIVATE_HITS = []
let server, privateServer, port, privatePort
const routes = new Map()
const hits = []

const listen = (handler) => new Promise((resolve) => { const s = https.createServer(tls, handler); s.listen(0, '127.0.0.1', () => resolve(s)) })
before(async () => {
  server = await listen((req, res) => {
    hits.push({ host: req.headers.host, url: req.url, headers: req.headers })
    const route = routes.get(`${req.headers.host}${req.url}`)
    if (!route) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('missing'); return }
    route(req, res)
  })
  privateServer = await listen((req, res) => { PRIVATE_HITS.push(req.url); res.end('internal') })
  port = server.address().port
  privatePort = privateServer.address().port
})
after(() => { server?.close(); privateServer?.close() })

// The only way to reach a socket: the policy has approved the address, then the seam points it at a local server.
const network = (dns) => ({
  resolve: async (host) => { dns.calls = (dns.calls ?? 0) + 1; const answer = typeof dns[host] === 'function' ? dns[host]() : dns[host]; if (!answer) throw new Error('ENOTFOUND'); return answer },
  dial: (address) => (address === PUBLIC ? { address: '127.0.0.1', port } : { address: '127.0.0.1', port: privatePort }),
  ca: tls.cert.toString(),
})
const html = (body, headers = {}) => (_req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...headers }); res.end(body) }
const options = { maxBytes: 64 * 1024, timeoutMs: 3000, maxRedirects: 3, accept: ['text/html'], acceptHeader: 'text/html' }
const code = async (promise) => { try { await promise; return 'OK' } catch (error) { assert.ok(error instanceof SafeFetchError, String(error)); return error.code } }

test('address policy blocks every non-public range', () => {
  for (const address of ['127.0.0.1', '127.255.255.254', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::a00:1', '2002:a00:1::1', '2001::1', 'not-an-ip']) {
    assert.equal(isBlockedAddress(address), true, address)
  }
  for (const address of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111']) assert.equal(isBlockedAddress(address), false, address)
})

test('URL policy: https only, default port, no credentials, IP literals in any notation', () => {
  for (const raw of ['https://localhost/a', 'https://LOCALHOST./a', 'https://foo.localhost/', 'https://intranet/', 'https://printer.local/', 'https://db.internal/',
    'https://127.0.0.1/', 'https://2130706433/', 'https://0177.0.0.1/', 'https://0x7f.0.0.1/', 'https://127.1/', 'https://10.1.2.3/', 'https://[::1]/',
    'https://[::ffff:127.0.0.1]/', 'https://[fd00::1]/', 'https://169.254.169.254/latest/meta-data/']) {
    assert.throws(() => parsePublicUrl(raw), (error) => error.code === 'BLOCKED', raw)
  }
  for (const raw of ['http://news.example.com/', 'ftp://news.example.com/', 'https://u:p@news.example.com/', 'https://news.example.com:8443/', 'javascript:alert(1)', 'https://news.example.com/\nx', 'not a url'])
    assert.throws(() => parsePublicUrl(raw), (error) => error.code === 'INVALID_URL', raw)
  assert.equal(parsePublicUrl('https://News.Example.com/a?b=1#frag').href, 'https://news.example.com/a?b=1')
})

test('fetches a public page with the pinned address, no cookies and our user agent', async () => {
  routes.set('news.example.com/ok', html('<p>xin chào</p>', { 'set-cookie': 'a=1' }))
  const dns = { 'news.example.com': [PUBLIC] }
  const result = await safeFetch('https://news.example.com/ok', options, network(dns))
  assert.equal(result.body.toString(), '<p>xin chào</p>')
  assert.equal(result.contentType, 'text/html')
  assert.equal(result.charset, 'utf-8')
  assert.equal(dns.calls, 1)
  const request = hits.at(-1)
  assert.equal(request.headers.cookie, undefined)
  assert.match(request.headers['user-agent'], /^ChuyenNhoReader\//)
  assert.equal(request.headers.host, 'news.example.com')
})

test('DNS: a mixed answer is blocked and a second lookup can never be used (rebinding)', async () => {
  routes.set('rebind.example.com/a', html('<p>public</p>'))
  assert.equal(await code(safeFetch('https://mixed.example.com/a', options, network({ 'mixed.example.com': [PUBLIC, '10.0.0.5'] }))), 'BLOCKED')
  assert.equal(await code(safeFetch('https://private.example.com/a', options, network({ 'private.example.com': ['192.168.0.10'] }))), 'BLOCKED')
  assert.equal(await code(safeFetch('https://v6.example.com/a', options, network({ 'v6.example.com': ['::ffff:10.0.0.1'] }))), 'BLOCKED')
  assert.equal(await code(safeFetch('https://gone.example.com/a', options, network({}))), 'UNRESOLVED')
  let answers = 0
  const dns = { 'rebind.example.com': () => (answers++ === 0 ? [PUBLIC] : ['127.0.0.1']) }
  const result = await safeFetch('https://rebind.example.com/a', options, network(dns))
  assert.equal(result.body.toString(), '<p>public</p>')
  assert.equal(dns.calls, 1)
  assert.deepEqual(PRIVATE_HITS, [])
})

test('redirects are re-validated hop by hop and capped', async () => {
  routes.set('news.example.com/to-private', (_req, res) => { res.writeHead(302, { location: 'https://127.0.0.1/admin' }); res.end() })
  routes.set('news.example.com/to-internal-name', (_req, res) => { res.writeHead(301, { location: 'https://cms.example.com/x' }); res.end() })
  routes.set('news.example.com/to-http', (_req, res) => { res.writeHead(302, { location: 'http://news.example.com/ok' }); res.end() })
  routes.set('news.example.com/relative', (_req, res) => { res.writeHead(307, { location: '/ok' }); res.end() })
  routes.set('news.example.com/loop', (_req, res) => { res.writeHead(302, { location: '/loop' }); res.end() })
  const dns = { 'news.example.com': [PUBLIC], 'cms.example.com': ['10.20.30.40'] }
  assert.equal(await code(safeFetch('https://news.example.com/to-private', options, network(dns))), 'BLOCKED')
  assert.equal(await code(safeFetch('https://news.example.com/to-internal-name', options, network(dns))), 'BLOCKED')
  assert.equal(await code(safeFetch('https://news.example.com/to-http', options, network(dns))), 'INVALID_URL')
  assert.equal(await code(safeFetch('https://news.example.com/loop', options, network(dns))), 'REDIRECT_LIMIT')
  const followed = await safeFetch('https://news.example.com/relative', options, network(dns))
  assert.equal(followed.url, 'https://news.example.com/ok')
  assert.deepEqual(PRIVATE_HITS, [])
})

test('size, type, status, encoding and time limits', async () => {
  const big = '<p>' + 'a'.repeat(70 * 1024) + '</p>'
  routes.set('news.example.com/big', html(big))
  routes.set('news.example.com/big-chunked', (_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.write(big.slice(0, 40000)); res.end(big.slice(40000)) })
  routes.set('news.example.com/bomb', (_req, res) => { res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' }); res.end(zlib.gzipSync(Buffer.alloc(5 * 1024 * 1024, 32))) })
  routes.set('news.example.com/gzip', (_req, res) => { res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' }); res.end(zlib.gzipSync('<p>nén</p>')) })
  routes.set('news.example.com/pdf', (_req, res) => { res.writeHead(200, { 'content-type': 'application/pdf' }); res.end('%PDF-1.7') })
  routes.set('news.example.com/json', (_req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}') })
  routes.set('news.example.com/slow', (_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.write('<p>'); setTimeout(() => res.end('</p>'), 2000) })
  routes.set('news.example.com/hang', () => {})
  routes.set('news.example.com/gone', (_req, res) => { res.writeHead(410); res.end() })
  const dns = { 'news.example.com': [PUBLIC] }
  assert.equal(await code(safeFetch('https://news.example.com/big', options, network(dns))), 'TOO_LARGE')
  assert.equal(await code(safeFetch('https://news.example.com/big-chunked', options, network(dns))), 'TOO_LARGE')
  assert.equal(await code(safeFetch('https://news.example.com/bomb', options, network(dns))), 'TOO_LARGE')
  assert.equal((await safeFetch('https://news.example.com/gzip', options, network(dns))).body.toString(), '<p>nén</p>')
  assert.equal(await code(safeFetch('https://news.example.com/pdf', options, network(dns))), 'UNSUPPORTED_TYPE')
  assert.equal(await code(safeFetch('https://news.example.com/json', options, network(dns))), 'UNSUPPORTED_TYPE')
  assert.equal(await code(safeFetch('https://news.example.com/slow', { ...options, timeoutMs: 500 }, network(dns))), 'TIMEOUT')
  assert.equal(await code(safeFetch('https://news.example.com/hang', { ...options, timeoutMs: 500 }, network(dns))), 'TIMEOUT')
  await assert.rejects(safeFetch('https://news.example.com/gone', options, network(dns)), (error) => error.code === 'HTTP_STATUS' && error.status === 410)
})

test('certificate is checked against the host name, not the pinned IP', async () => {
  routes.set('news.example.org/x', html('<p>x</p>'))
  assert.equal(await code(safeFetch('https://news.example.org/x', options, network({ 'news.example.org': [PUBLIC] }))), 'NETWORK')
})
