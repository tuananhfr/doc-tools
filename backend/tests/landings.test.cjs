// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, randomBytes, randomUUID } = require('node:crypto')
const { mkdtempSync, rmSync, existsSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
// Must be set before configuration() is first read; dotenv never overrides existing variables.
process.env.SITE_ORIGINS = 'https://site.test'
const assetDir = mkdtempSync(join(tmpdir(), 'qa-landing-assets-'))
process.env.LANDING_ASSET_DIR = assetDir
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')

const tag = randomBytes(5).toString('hex')
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(`qa-landing-${tag}`)])
const GIF = Buffer.from('GIF89a' + 'x'.repeat(20), 'latin1')
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

test('landing pages: staff gate, draft validation, revisions, publish, pictures', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const key = `qa-${tag}`
  const assetIds = new Set()
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)

    async function person(name, role = null) {
      const id = randomUUID()
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, `qa-landing-${name}-${tag}@example.test`])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const token = randomBytes(32).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const trusted = { 'x-cn-request': '1', origin: 'https://site.test' }
    const call = (user, method, url, payload) => api.inject({
      method, url: `/api/v1${url}`, payload,
      headers: { ...(user ? { cookie: user.cookie } : {}), ...trusted, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    })
    const upload = (user, name, bytes) => api.inject({
      method: 'POST', url: '/api/v1/admin/landings/assets', payload: bytes,
      headers: { cookie: user.cookie, ...trusted, 'content-type': 'application/octet-stream', 'x-cn-filename': encodeURIComponent(name) },
    })

    const owner = await person('owner', 'owner')
    const admin = await person('admin', 'admin')
    const reviewer = await person('reviewer', 'reviewer')
    const member = await person('member')

    // Gates: trusted header even for reads, staff only, and reviewers lack the permission.
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/admin/landings', headers: { cookie: owner.cookie } })).json().code, 'UNTRUSTED_REQUEST')
    assert.equal((await call(null, 'GET', '/admin/landings')).statusCode, 401)
    assert.equal((await call(member, 'GET', '/admin/landings')).json().code, 'NOT_STAFF')
    assert.equal((await call(reviewer, 'GET', '/admin/landings')).json().code, 'FORBIDDEN')
    assert.equal((await call(admin, 'GET', '/admin/landings')).statusCode, 200)

    // Create: key shape, duplicate, default draft from the office homepage.
    for (const bad of ['Xay-Dung', '-x', 'x-', 'a'.repeat(41), '../x', 'xây-dựng']) {
      const response = await call(admin, 'POST', '/admin/landings', { key: bad, name: 'QA' })
      assert.equal(response.statusCode, 400, bad)
      assert.equal(response.json().field, 'key')
    }
    assert.equal((await call(admin, 'POST', '/admin/landings', { key, name: '  ' })).json().field, 'name')
    const created = (await call(admin, 'POST', '/admin/landings', { key, name: 'Xây dựng QA' })).json()
    assert.equal(created.landing.key, key)
    assert.equal(created.landing.rev, 1)
    assert.equal(created.landing.published, false)
    assert.equal(created.landing.draft.tools.items.length, 3)
    assert.equal((await call(admin, 'POST', '/admin/landings', { key, name: 'x' })).json().code, 'LANDING_EXISTS')
    assert.ok((await call(admin, 'GET', '/admin/landings')).json().landings.some((landing) => landing.key === key))
    assert.equal((await call(admin, 'GET', '/admin/landings/khong-co-trang-nay')).statusCode, 404)

    // Nothing public until published.
    assert.equal((await call(null, 'GET', `/landings/${key}`)).statusCode, 404)
    assert.equal((await call(null, 'GET', '/landings/..%2Fx')).statusCode, 404)

    const draft = created.landing.draft
    const save = (user, change, baseRev) => call(user, 'PUT', `/admin/landings/${key}`, { draft: change, baseRev })
    const edit = (mutate) => { const copy = structuredClone(draft); mutate(copy); return copy }

    // Validation names the field that failed.
    const cases = [
      [(doc) => { doc.theme.accent = 'red' }, 'theme.accent'],
      [(doc) => { doc.theme.mode = 'blue' }, 'theme.mode'],
      [(doc) => { doc.hero.title = '   ' }, 'hero.title'],
      [(doc) => { doc.hero.body = 'x'.repeat(401) }, 'hero.body'],
      [(doc) => { doc.tools.items[1].slug = 'khong-co' }, 'tools.items.1.slug'],
      [(doc) => { doc.tools.items.pop() }, 'tools.items'],
      [(doc) => { doc.cases.items[0].target = 'https://evil.test' }, 'cases.items.0.target'],
      [(doc) => { doc.hero.image = 'x' }, 'hero.image'],
      [(doc) => { doc.canonicalUrl = 'http://site-xay-dung.test/chuyen-nho' }, 'canonicalUrl'],
      [(doc) => { doc.canonicalUrl = 'javascript:alert(1)' }, 'canonicalUrl'],
      [(doc) => { delete doc.privacy }, 'privacy'],
    ]
    for (const [mutate, field] of cases) {
      const response = await save(admin, edit(mutate), 1)
      assert.equal(response.statusCode, 400, field)
      assert.equal(response.json().field, field)
    }
    assert.equal((await save(admin, edit((doc) => { doc.hero.image = 'a'.repeat(64) }), 1)).json().code, 'INVALID_INPUT')
    assert.equal((await call(admin, 'PUT', `/admin/landings/${key}`, { draft })).json().code, 'INVALID_INPUT')

    // Saving cleans text into one plain line; markup stays literal, unknown fields are dropped.
    const saved = (await save(admin, edit((doc) => {
      doc.hero.title = '  <b>Xây</b>\n  nhà  '
      doc.theme.accent = '#C8102E'
      doc.canonicalUrl = 'https://site-xay-dung.test/chuyen-nho'
      doc.tools.items[0] = { slug: 'huong-nha-la-ban', title: '', body: '' }
      doc.extra = 'drop me'
    }), 1)).json()
    assert.equal(saved.landing.rev, 2)
    assert.equal(saved.landing.draft.hero.title, '<b>Xây</b> nhà')
    assert.equal(saved.landing.draft.theme.accent, '#c8102e')
    assert.equal(saved.landing.draft.extra, undefined)
    assert.equal(saved.landing.unpublishedChanges, true)

    // Two staff editing at once: the stale revision loses and is told who won.
    const stale = await save(owner, draft, 1)
    assert.equal(stale.statusCode, 409)
    assert.equal(stale.json().code, 'LANDING_CONFLICT')
    assert.equal(stale.json().landing.rev, 2)

    // Publish only the revision the person looked at.
    assert.equal((await call(admin, 'POST', `/admin/landings/${key}/publish`, { baseRev: 1 })).json().code, 'LANDING_CONFLICT')
    const published = (await call(admin, 'POST', `/admin/landings/${key}/publish`, { baseRev: 2 })).json()
    assert.equal(published.landing.published, true)
    assert.equal(published.landing.unpublishedChanges, false)
    const live = await call(null, 'GET', `/landings/${key}`)
    assert.equal(live.statusCode, 200)
    assert.equal(live.headers['cache-control'], 'no-store')
    assert.equal(live.json().landing.hero.title, '<b>Xây</b> nhà')
    assert.equal(live.json().landing.canonicalUrl, 'https://site-xay-dung.test/chuyen-nho')

    // A later draft does not change the live page until published again.
    const third = (await save(admin, edit((doc) => { doc.hero.title = 'Bản nháp mới' }), 2)).json()
    assert.equal(third.landing.unpublishedChanges, true)
    assert.equal((await call(null, 'GET', `/landings/${key}`)).json().landing.hero.title, '<b>Xây</b> nhà')

    // Pictures: PNG/JPEG/WebP only, named by content, served cacheable to other origins.
    assert.equal((await upload(admin, 'logo.svg', SVG)).statusCode, 415)
    assert.equal((await upload(admin, 'banner.gif', GIF)).statusCode, 415)
    assert.equal((await upload(admin, 'fake.png', SVG)).statusCode, 415)
    assert.equal((await upload(reviewer, 'logo.png', PNG)).json().code, 'FORBIDDEN')
    const picture = (await upload(admin, 'logo.png', PNG)).json()
    assetIds.add(picture.asset.id)
    assert.equal(picture.asset.id, createHash('sha256').update(PNG).digest('hex'))
    assert.equal((await upload(owner, 'copy.png', PNG)).json().asset.id, picture.asset.id)
    const served = await call(null, 'GET', `/landings/assets/${picture.asset.id}`)
    assert.equal(served.statusCode, 200)
    assert.equal(served.headers['content-type'], 'image/png')
    assert.equal(served.headers['x-content-type-options'], 'nosniff')
    assert.equal(served.headers['cross-origin-resource-policy'], 'cross-origin')
    assert.match(served.headers['cache-control'], /immutable/)
    assert.deepEqual(served.rawPayload, PNG)
    assert.equal((await call(null, 'GET', `/landings/assets/${'0'.repeat(64)}`)).statusCode, 404)
    assert.equal((await call(null, 'GET', '/landings/assets/..%2F..%2Fpackage.json')).statusCode, 404)

    const withPicture = (await save(admin, edit((doc) => { doc.theme.logo = picture.asset.id; doc.cases.items[2].image = picture.asset.id }), 3)).json()
    assert.equal(withPicture.landing.draft.theme.logo, picture.asset.id)

    // A picture whose file is gone answers 404 instead of a broken stream.
    rmSync(join(assetDir, picture.asset.id))
    assert.equal((await call(null, 'GET', `/landings/assets/${picture.asset.id}`)).statusCode, 404)

    // Unpublish takes the page down; the draft stays.
    const down = (await call(admin, 'POST', `/admin/landings/${key}/unpublish`)).json()
    assert.equal(down.landing.published, false)
    assert.equal(down.landing.draft.theme.logo, picture.asset.id)
    assert.equal((await call(null, 'GET', `/landings/${key}`)).statusCode, 404)

    const [audit] = await database.pool.execute('SELECT action FROM admin_audit WHERE target_type = ? AND (target_id = ? OR target_id IS NULL) AND actor_id IN (?, ?)', ['landing', key, admin.id, owner.id])
    const actions = new Set(audit.map((row) => row.action))
    for (const action of ['LANDING_CREATED', 'LANDING_DRAFT_SAVED', 'LANDING_PUBLISHED', 'LANDING_UNPUBLISHED', 'LANDING_ASSET_UPLOADED']) assert.ok(actions.has(action), action)
  } finally {
    if (database) {
      await database.pool.execute('DELETE FROM landing_pages WHERE landing_key = ?', [key])
      for (const id of assetIds) await database.pool.execute('DELETE FROM landing_assets WHERE id = ?', [id])
      for (const { id } of users) {
        for (const table of ['user_sessions', 'user_roles']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [id])
      }
    }
    await app.close()
    if (existsSync(assetDir)) rmSync(assetDir, { recursive: true, force: true })
  }
})
