const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, randomBytes, randomUUID } = require('node:crypto')

const DAY = 86400

test('Pro lifecycle: reminder, read-only window, warned purge, renewal; self-service account deletion', async () => {
  process.env.SITE_ORIGINS = 'https://site.test'
  process.env.MAIL_TRANSPORT = 'log'
  process.env.SITE_PUBLIC_URL = 'https://site.test/doc-tools/'
  require('reflect-metadata')
  require('dotenv/config')
  const { NestFactory } = require('@nestjs/core')
  const { AppModule } = require('../dist/app.module')
  const { createHttpAdapter } = require('../dist/config/http-adapter')
  const { DatabaseService } = require('../dist/database/database.service')
  const { PlanLifecycleService } = require('../dist/lifecycle/plan-lifecycle.service')
  const { renderMail } = require('../dist/mail/mail-templates')

  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const tag = randomBytes(5).toString('hex')
  const now = Math.floor(Date.now() / 1000)
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const lifecycle = app.get(PlanLifecycleService)

    async function person(name, { plans = [], items = 0, role = null, status = 'active' } = {}) {
      const id = randomUUID()
      const email = `qa-life-${name}-${tag}@example.test`
      await database.pool.execute('INSERT INTO users (id, email, status) VALUES (?, ?, ?)', [id, email, status])
      for (const [startsAt, endsAt] of plans) await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [id, startsAt, endsAt])
      for (let index = 0; index < items; index += 1) {
        await database.pool.execute("INSERT INTO saved_items (id, user_id, kind, tool_id, title, payload, size_bytes, rev, created_at, updated_at) VALUES (?, ?, 'result', 'tien-dien', ?, '{}', 2, 1, ?, ?)", [randomUUID(), id, `Mục ${index}`, now, now])
      }
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const token = randomBytes(32).toString('base64url')
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, email, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const call = (user, method, url, payload, { trusted = true } = {}) => api.inject({
      method, url: `/api/v1${url}`, payload,
      headers: { ...(user ? { cookie: user.cookie } : {}), ...(trusted ? { 'x-cn-request': '1', origin: 'https://site.test' } : {}), ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    })
    // Payloads are wiped once a mail leaves the queue, so the notices table says what each mail was about.
    const mails = async (user, template) => Number((await database.pool.execute('SELECT COUNT(*) AS total FROM mail_outbox WHERE to_email = ? AND template = ?', [user.email, template]))[0][0].total)
    const notices = async (user, kind) => (await database.pool.execute('SELECT plan_end, sent_at FROM plan_notices WHERE user_id = ? AND kind = ? ORDER BY plan_end', [user.id, kind]))[0].map((row) => [Number(row.plan_end), Number(row.sent_at)])
    const itemCount = async (user) => Number((await database.pool.execute('SELECT COUNT(*) AS total FROM saved_items WHERE user_id = ?', [user.id]))[0][0].total)

    const ending = await person('ending', { plans: [[now - 10 * DAY, now + 5 * DAY]] })
    const lapsed = await person('lapsed', { plans: [[now - 200 * DAY, now - 10 * DAY]], items: 2 })
    const longAgo = await person('long-ago', { plans: [[now - 400 * DAY, now - 200 * DAY]], items: 1 })
    const renewing = await person('renewing', { plans: [[now - 300 * DAY, now - 100 * DAY]], items: 1 })
    const disabled = await person('disabled', { plans: [[now - 300 * DAY, now - 100 * DAY]], items: 1, status: 'disabled' })
    const only = new Set(users.map((user) => user.id))
    const run = (at) => lifecycle.run(at, only)

    // Reminder: once per plan end, again only when a renewal moves the end.
    const first = await run(now)
    assert.equal(first.reminded, 1)
    assert.equal(await mails(ending, 'pro_expiring'), 1)
    assert.deepEqual(await notices(ending, 'pro_expiring'), [[now + 5 * DAY, now]])
    assert.equal((await run(now + 3600)).reminded, 0, 'the hourly job never mails the same reminder twice')
    await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [ending.id, now, now + 40 * DAY])
    assert.equal((await run(now + 7200)).reminded, 0, 'a renewed plan is not about to end')

    // Ended long ago without any warning: warned first, never deleted in the same breath.
    assert.equal(first.warned, 2, 'long-ago and renewing get the warning, lapsed is still inside its window, disabled is skipped')
    assert.equal(first.purged, 0)
    assert.equal(await mails(longAgo, 'cloud_purge'), 1)
    assert.equal(await lifecycle.purgeAt(longAgo.id, now), now + 7 * DAY)
    assert.equal((await run(now + 6 * DAY)).purged, 0)
    assert.equal(await itemCount(longAgo), 1)

    // Renewal inside the window keeps everything.
    await database.pool.execute("INSERT INTO user_plans (user_id, plan, starts_at, ends_at, granted_by) VALUES (?, 'pro', ?, ?, 'qa')", [renewing.id, now + DAY, now + 30 * DAY])
    const week = await run(now + 7 * DAY)
    assert.equal(week.purged, 1, 'only long-ago')
    assert.equal(await itemCount(longAgo), 0)
    assert.equal(await itemCount(renewing), 1)
    assert.equal(await itemCount(disabled), 1)
    assert.equal(await mails(disabled, 'cloud_purge'), 0)

    // Read-only window: the list says when deletion is due; warning 7 days before, deletion after.
    const list = JSON.parse((await call(lapsed, 'GET', '/me/saved')).body)
    assert.equal(list.writable, false)
    assert.equal(list.items.length, 2)
    assert.ok(Math.abs(list.purgeAt - (now + 80 * DAY)) <= 60, `purgeAt ${list.purgeAt}`)
    assert.equal(JSON.parse((await call(ending, 'GET', '/me/saved')).body).purgeAt, null)
    assert.equal((await run(now + 72 * DAY)).warned, 0)
    assert.equal((await run(now + 75 * DAY)).warned, 1)
    assert.deepEqual(await notices(lapsed, 'cloud_purge'), [[now - 10 * DAY, now + 75 * DAY]])
    assert.equal(JSON.parse((await call(lapsed, 'GET', '/me/saved')).body).purgeAt, now + 82 * DAY, 'a late warning still gives 7 days')
    assert.equal((await run(now + 81 * DAY)).purged, 0)
    assert.equal((await run(now + 82 * DAY)).purged, 2)
    assert.equal(await itemCount(lapsed), 0)
    // Runs go back in time here on purpose: only the renewed plan of `ending` is left to remind about.
    assert.equal((await run(now + 35 * DAY)).reminded, 1)
    assert.equal(await mails(ending, 'pro_expiring'), 2)

    // The mail itself: both languages, the last valid day (not the exclusive end), links from SITE_PUBLIC_URL.
    const rendered = renderMail('pro_expiring', { endsAt: Date.UTC(2026, 9, 31, 17) / 1000, siteUrl: 'https://site.test/doc-tools' })
    assert.match(rendered.text, /31 tháng 10, 2026/)
    assert.match(rendered.text, /31 October 2026/)
    assert.match(rendered.text, /https:\/\/site\.test\/doc-tools\/tai-khoan/)
    assert.match(renderMail('cloud_purge', { purgeAt: now, items: 3, siteUrl: 'https://x.test' }).html, /lang="en"/)

    // Self-service deletion.
    const leaving = await person('leaving', { plans: [[now - DAY, now + DAY]], items: 1 })
    const staff = await person('staff', { role: 'admin' })
    assert.equal((await call(null, 'DELETE', '/me', { confirmEmail: leaving.email })).statusCode, 401)
    assert.equal((await call(leaving, 'DELETE', '/me', { confirmEmail: leaving.email }, { trusted: false })).statusCode, 403)
    const mismatch = await call(leaving, 'DELETE', '/me', { confirmEmail: 'someone@example.test' })
    assert.deepEqual([mismatch.statusCode, JSON.parse(mismatch.body).code], [400, 'CONFIRM_MISMATCH'])
    const staffTry = await call(staff, 'DELETE', '/me', { confirmEmail: staff.email })
    assert.deepEqual([staffTry.statusCode, JSON.parse(staffTry.body).code], [409, 'STAFF_ACCOUNT'])
    const gone = await call(leaving, 'DELETE', '/me', { confirmEmail: `  ${leaving.email.toUpperCase()} ` })
    assert.equal(gone.statusCode, 200, gone.body)
    assert.match(String(gone.headers['set-cookie']), /cn_session=;/)
    const [[row]] = await database.pool.execute('SELECT COUNT(*) AS total FROM users WHERE id = ?', [leaving.id])
    assert.equal(Number(row.total), 0)
    assert.equal(await itemCount(leaving), 0)
    const [audit] = await database.pool.execute('SELECT action, actor FROM user_audit WHERE user_id = ?', [leaving.id])
    assert.deepEqual(audit.map((entry) => [entry.action, entry.actor]), [['DELETED', 'self']])
    assert.equal(JSON.parse((await call(leaving, 'GET', '/me')).body).user, null)
  } finally {
    if (database) {
      for (const user of users) {
        for (const table of ['saved_items', 'plan_notices', 'user_sessions', 'user_plans', 'user_roles', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM mail_outbox WHERE to_email = ?', [user.email])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
