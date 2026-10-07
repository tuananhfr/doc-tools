const { test } = require('node:test')
const assert = require('node:assert/strict')
const { existsSync, mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { createHash, randomBytes, randomUUID } = require('node:crypto')

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(200)])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(200)])

test('AI uploads: type sniffing, limits, one-time links, removal, sweep and account deletion', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cn-ai-uploads-'))
  process.env.SITE_ORIGINS = 'https://site.test'
  process.env.AI_UPLOAD_DIR = dir
  process.env.AI_UPLOAD_MAX_BYTES = '2000'
  process.env.AI_UPLOAD_DAILY_BYTES = '5000'
  process.env.AI_UPLOAD_PUBLIC_URL = 'https://site.test/api/v1/'
  process.env.MCP_ALLOWED_IPS = ''
  require('reflect-metadata')
  require('dotenv/config')
  const { NestFactory } = require('@nestjs/core')
  const { AppModule } = require('../dist/app.module')
  const { createHttpAdapter } = require('../dist/config/http-adapter')
  const { DatabaseService } = require('../dist/database/database.service')
  const { AccountDeletionService } = require('../dist/accounts/account-deletion.service')
  const { AiUploadsService } = require('../dist/ai/ai-uploads.service')

  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const tag = randomBytes(5).toString('hex')
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)

    async function person(name, { pro = false } = {}) {
      const id = randomUUID()
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-upload-${name}-${tag}@example.test`])
      if (pro) await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [id, now - 60, now + 86400])
      const token = randomBytes(32).toString('base64url')
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const headers = (user, extra = {}, trusted = true) => ({ ...(user ? { cookie: user.cookie } : {}), ...(trusted ? { 'x-cn-request': '1', origin: 'https://site.test' } : {}), ...extra })
    const upload = (user, name, body, { trusted = true, type = 'application/octet-stream' } = {}) => api.inject({
      method: 'POST', url: '/api/v1/ai/uploads', payload: body, headers: headers(user, { 'content-type': type, 'x-cn-filename': encodeURIComponent(name) }, trusted),
    })
    const call = (user, method, url) => api.inject({ method, url: `/api/v1${url}`, headers: headers(user) })
    const raw = (url, remoteAddress = '127.0.0.1') => api.inject({ method: 'GET', url: url.replace('https://site.test', ''), remoteAddress })
    const rowOf = async (id) => (await database.pool.execute('SELECT * FROM ai_uploads WHERE id = ?', [id]))[0][0]

    const free = await person('free')
    const pro = await person('pro', { pro: true })
    const other = await person('other', { pro: true })

    // Who may upload.
    assert.equal((await upload(null, 'a.png', PNG)).json().code, 'SIGNED_OUT')
    assert.equal((await upload(free, 'a.png', PNG)).json().code, 'PRO_REQUIRED')
    assert.equal((await upload(pro, 'a.png', PNG, { trusted: false })).json().code, 'UNTRUSTED_REQUEST')

    // The bytes decide, not the name or the browser's content type.
    assert.equal((await upload(pro, 'a.png', JSON.stringify({ a: 1 }), { type: 'application/json' })).json().code, 'UPLOAD_TYPE')
    assert.equal((await upload(pro, 'a.png', JPEG)).json().code, 'UPLOAD_TYPE', 'jpeg bytes under a .png name')
    // Text would be summarised by the tenant's background provider in GoClaw's vault; it travels in the message instead.
    assert.equal((await upload(pro, 'a.md', Buffer.from('# Tiêu đề'))).json().code, 'UPLOAD_TYPE')
    assert.equal((await upload(pro, 'a.pdf', Buffer.from('%PDF-1.7\n'))).json().code, 'UPLOAD_TYPE', 'PDF waits for a per-agent document provider')
    assert.equal((await upload(pro, 'a.png', Buffer.alloc(0))).json().code, 'UPLOAD_TYPE')
    assert.equal((await upload(pro, '', PNG)).json().code, 'INVALID_INPUT')
    const big = await upload(pro, 'big.png', Buffer.concat([PNG, randomBytes(2000)]))
    assert.equal(big.statusCode, 413)
    assert.equal(big.json().code, 'UPLOAD_TOO_LARGE')

    const image = await upload(pro, '../../etc/ảnh "chụp".png', PNG)
    assert.equal(image.statusCode, 200, image.payload)
    const imageUpload = image.json().upload
    assert.equal(imageUpload.filename, 'ảnh chụp.png', 'path parts and quotes are dropped from the name')
    assert.equal(imageUpload.mimeType, 'image/png')
    assert.equal(imageUpload.size, PNG.length)
    assert.ok(existsSync(join(dir, imageUpload.id)), 'stored under its id, never under the given name')
    const second = (await upload(pro, 'chụp 2.jpg', JPEG)).json().upload
    assert.equal(second.mimeType, 'image/jpeg')

    // One-time link: only the owner can mint it, GoClaw can use it once.
    assert.equal((await call(other, 'POST', `/ai/uploads/${imageUpload.id}/link`)).json().code, 'NOT_FOUND')
    assert.equal((await call(pro, 'POST', '/ai/uploads/not-a-uuid/link')).json().code, 'NOT_FOUND')
    const link = (await call(pro, 'POST', `/ai/uploads/${imageUpload.id}/link`)).json()
    assert.match(link.url, new RegExp(`^https://site\\.test/api/v1/ai/uploads/${imageUpload.id}/raw/[A-Za-z0-9_-]{43}/%E1%BA%A3nh%20ch%E1%BB%A5p\\.png$`))
    assert.equal((await rowOf(imageUpload.id)).link_hash.length, 64, 'only the hash of the link token is stored')
    const wrongToken = link.url.replace(/raw\/[^/]+/, `raw/${randomBytes(32).toString('base64url')}`)
    assert.equal((await raw(wrongToken)).statusCode, 404)
    process.env.MCP_ALLOWED_IPS = '10.9.9.9'
    assert.equal((await raw(link.url)).statusCode, 403, 'only GoClaw hosts may fetch')
    process.env.MCP_ALLOWED_IPS = ''
    const fetched = await raw(link.url)
    assert.equal(fetched.statusCode, 200)
    assert.equal(fetched.headers['content-type'], 'image/png')
    assert.equal(fetched.headers['x-content-type-options'], 'nosniff')
    assert.ok(fetched.rawPayload.equals(PNG))
    assert.equal((await raw(link.url)).statusCode, 404, 'a link works once')
    const jpegLink = (await call(pro, 'POST', `/ai/uploads/${second.id}/link`)).json()
    assert.equal((await raw(jpegLink.url)).headers['content-type'], 'image/jpeg')

    // Expired link.
    const stale = (await call(pro, 'POST', `/ai/uploads/${imageUpload.id}/link`)).json()
    await database.pool.execute('UPDATE ai_uploads SET link_expires_at = ? WHERE id = ?', [Math.floor(Date.now() / 1000) - 1, imageUpload.id])
    assert.equal((await raw(stale.url)).statusCode, 404)

    // Removal: owner only; the file goes at once, the row keeps counting toward the quota.
    assert.equal((await call(other, 'DELETE', `/ai/uploads/${imageUpload.id}`)).statusCode, 404)
    const pending = (await call(pro, 'POST', `/ai/uploads/${imageUpload.id}/link`)).json()
    assert.equal((await call(pro, 'DELETE', `/ai/uploads/${imageUpload.id}`)).json().ok, true)
    assert.equal(existsSync(join(dir, imageUpload.id)), false)
    assert.equal((await raw(pending.url)).statusCode, 404, 'removing revokes an outstanding link')
    assert.equal((await call(pro, 'POST', `/ai/uploads/${imageUpload.id}/link`)).json().code, 'NOT_FOUND')
    assert.equal((await call(pro, 'DELETE', `/ai/uploads/${imageUpload.id}`)).statusCode, 404)

    // Daily quota (5000 bytes): removed files still count.
    const filler = Buffer.concat([PNG, randomBytes(1700)])
    assert.equal((await upload(pro, 'b.png', filler)).statusCode, 200)
    assert.equal((await upload(pro, 'c.png', filler)).statusCode, 200)
    const overQuota = await upload(pro, 'd.png', filler)
    assert.equal(overQuota.statusCode, 429)
    assert.equal(overQuota.json().code, 'UPLOAD_QUOTA')
    assert.equal((await upload(other, 'e.png', filler)).statusCode, 200, 'quota is per person')

    // Sweep removes expired files and rows.
    await database.pool.execute('UPDATE ai_uploads SET expires_at = ? WHERE id = ?', [Math.floor(Date.now() / 1000) - 1, second.id])
    assert.ok(await app.get(AiUploadsService).sweep() >= 1)
    assert.equal(await rowOf(second.id), undefined)
    assert.equal(existsSync(join(dir, second.id)), false)

    // Account deletion takes every file with it.
    const [before] = await database.pool.execute('SELECT id FROM ai_uploads WHERE user_id = ?', [pro.id])
    assert.ok(before.length >= 2)
    await app.get(AccountDeletionService).delete(pro.id, 'qa')
    const [after] = await database.pool.execute('SELECT id FROM ai_uploads WHERE user_id = ?', [pro.id])
    assert.equal(after.length, 0)
    for (const row of before) assert.equal(existsSync(join(dir, row.id)), false)
  } finally {
    if (database) {
      for (const user of users) {
        for (const table of ['ai_uploads', 'user_sessions', 'user_plans', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
