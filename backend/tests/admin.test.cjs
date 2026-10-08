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
const { SessionService } = require('../dist/session/session.service')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')
const tag = randomBytes(5).toString('hex')

test('admin area: roles, permissions, users, settings, review and deletion', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const toolId = `qa-admin-${tag}`
  const ip = `198.51.100.${(randomBytes(1)[0] % 250) + 1}`
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)

    async function signIn(id, sessionAge = 0) {
      const token = randomBytes(32).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now - sessionAge, now + 3600, now])
      return `cn_session=${token}`
    }
    async function person(name, role = null, sessionAge = 0) {
      const id = randomUUID()
      const email = `qa-${name}-${tag}@example.test`
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, email])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      const user = { id, email, cookie: await signIn(id, sessionAge) }
      users.push(user)
      return user
    }
    const headers = (user) => ({ ...(user ? { cookie: user.cookie } : {}), 'x-cn-request': '1', origin: 'https://site.test' })
    const call = (user, method, url, payload) => api.inject({ method, url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1', headers: headers(user) })

    const owner = await person('owner', 'owner')
    const admin = await person('admin', 'admin')
    const reviewer = await person('reviewer', 'reviewer')
    const member = await person('member')
    const stale = await person('stale', 'admin', 13 * 3600)

    // Guard: header, sign-in, staff role, fresh session, permission.
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/admin/whoami', headers: { cookie: owner.cookie } })).json().code, 'UNTRUSTED_REQUEST')
    assert.equal((await call(null, 'GET', '/admin/whoami')).statusCode, 401)
    assert.equal((await call(member, 'GET', '/admin/whoami')).json().code, 'NOT_STAFF')
    assert.equal((await call(stale, 'GET', '/admin/whoami')).json().code, 'STAFF_REAUTH')
    assert.equal((await call(reviewer, 'GET', '/admin/whoami')).json().staff.role, 'reviewer')
    assert.equal((await call(reviewer, 'GET', '/admin/users')).json().code, 'FORBIDDEN')
    assert.equal((await call(admin, 'GET', '/admin/settings')).json().code, 'FORBIDDEN')
    assert.equal((await call(owner, 'GET', '/admin/overview')).statusCode, 200)

    // /me tells the site who is staff.
    const me = (await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: reviewer.cookie } })).json()
    assert.deepEqual(me.staff, { role: 'reviewer', permissions: ['dashboard.view', 'tools.view', 'contributions.review'] })
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: member.cookie } })).json().staff, null)

    // Staff sessions last 12 hours.
    const fakeReply = { header() {} }
    await app.get(SessionService).start(reviewer.id, fakeReply)
    const [[latest]] = await database.pool.execute('SELECT created_at, expires_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC, expires_at DESC LIMIT 1', [reviewer.id])
    assert.equal(Number(latest.expires_at) - Number(latest.created_at), 12 * 3600)

    // Users: search, detail, guard rails, disable/enable, Pro.
    const found = (await call(admin, 'GET', `/admin/users?q=${encodeURIComponent(`qa-member-${tag}`)}`)).json()
    assert.equal(found.total, 1)
    assert.equal(found.items[0].id, member.id)
    assert.equal((await call(admin, 'GET', '/admin/users?q=100%25_')).statusCode, 200, 'LIKE wildcards are escaped')
    assert.equal((await call(admin, 'GET', '/admin/users?status=bogus')).statusCode, 400)
    assert.equal((await call(admin, 'POST', `/admin/users/${admin.id}/disable`, {})).json().code, 'SELF_TARGET')
    assert.equal((await call(admin, 'POST', `/admin/users/${owner.id}/disable`, {})).json().code, 'STAFF_TARGET')
    const disabled = await call(admin, 'POST', `/admin/users/${member.id}/disable`, { reason: 'qa spam' })
    assert.equal(disabled.json().user.status, 'disabled', disabled.payload)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: member.cookie } })).json().user, null, 'disabled user is signed out')
    assert.equal((await call(admin, 'POST', `/admin/users/${member.id}/enable`)).json().user.status, 'active')
    assert.equal((await call(admin, 'POST', `/admin/users/${member.id}/pro`, { until: '2000-01-01' })).statusCode, 400)
    const granted = await call(admin, 'POST', `/admin/users/${member.id}/pro`, { until: '2099-12-31', note: 'qa' })
    assert.ok(granted.json().user.proEndsAt > Date.now() / 1000, granted.payload)
    assert.equal((await call(reviewer, 'POST', `/admin/users/${member.id}/pro/revoke`, {})).statusCode, 403)
    assert.equal((await call(admin, 'POST', `/admin/users/${member.id}/pro/revoke`, {})).json().user.proEndsAt, null)
    assert.equal((await call(admin, 'PATCH', `/admin/users/${member.id}/profile`, { displayName: 'Tên Mới', publicAttribution: false })).json().user.displayName, 'Tên Mới')
    const detail = (await call(admin, 'GET', `/admin/users/${member.id}`)).json()
    assert.deepEqual(detail.adminAudit.map((row) => row.action).reverse(), ['USER_DISABLED', 'USER_ENABLED', 'PRO_GRANTED', 'PRO_REVOKED', 'PROFILE_EDITED'])
    assert.equal(detail.plans.length, 1)
    assert.equal(JSON.stringify(detail).includes('token'), false, 'session tokens never leave the server')

    // Settings: validated, applied at once, reset to default.
    assert.equal((await call(owner, 'PUT', '/admin/settings/contributions.guestHourly', { value: 0 })).statusCode, 400)
    assert.equal((await call(owner, 'PUT', '/admin/settings/nope', { value: 1 })).statusCode, 400)
    assert.equal((await call(owner, 'PUT', '/admin/settings/contributions.guestHourly', { value: 1 })).statusCode, 200)
    const idea = (text) => api.inject({ method: 'POST', url: '/api/v1/contributions', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip }, payload: { toolId, domain: 'ideas', baseSnapshotId: null, proposedChanges: [{ field: 'idea', before: '', after: text }], sourceRefs: [], jurisdiction: null } })
    const first = await idea(`Ý tưởng thử quản trị ${tag}`)
    assert.equal(first.statusCode, 200, first.payload)
    assert.equal((await idea(`Ý tưởng thứ hai ${tag}`)).statusCode, 429, 'lowered guest limit applies immediately')
    const listed = (await call(owner, 'GET', '/admin/settings')).json()
    assert.equal(listed.settings.find((item) => item.key === 'contributions.guestHourly').value, 1)
    assert.equal(typeof listed.system.mail.smtp.passwordSet, 'boolean', 'secrets are reported as set or not, never as values')
    assert.equal((await call(owner, 'DELETE', '/admin/settings/contributions.guestHourly')).json().settings.find((item) => item.key === 'contributions.guestHourly').overridden, false)

    // Closed sign-up: unknown emails get the usual answer but no code, and cannot verify.
    await call(owner, 'PUT', '/admin/settings/auth.signupOpen', { value: false })
    const outsider = `qa-outsider-${tag}@example.test`
    assert.deepEqual((await call(null, 'POST', '/auth/otp/request', { email: outsider })).json(), { ok: true })
    const [codes] = await database.pool.execute('SELECT id FROM auth_otps WHERE email_hash = ?', [hmac(`email:${outsider}`)])
    assert.equal(codes.length, 0)
    // A code issued before sign-up closed still cannot create the account.
    const now = Math.floor(Date.now() / 1000)
    await database.pool.execute('INSERT INTO auth_otps (email_hash, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)', [hmac(`email:${outsider}`), hmac(`otp:${outsider}:123456`), now + 600, now])
    assert.equal((await call(null, 'POST', '/auth/password/setup', { email: outsider, code: '123456', password: 'một mật khẩu đủ dài' })).json().code, 'SIGNUP_CLOSED')
    await database.pool.execute('DELETE FROM auth_otps WHERE email_hash = ?', [hmac(`email:${outsider}`)])
    await call(owner, 'DELETE', '/admin/settings/auth.signupOpen')

    // Review through the admin API keeps three different people.
    const receipt = createHash('sha256').update(first.json().receiptCode).digest('hex')
    const [[{ id: ideaId }]] = await database.pool.execute('SELECT id FROM contributions WHERE receipt_hash = ?', [receipt])
    const step = (user, action, extra = {}) => call(user, 'POST', `/admin/contributions/${ideaId}/transition`, { action, ...extra })
    assert.equal((await step(reviewer, 'verify')).json().code, 'NOTE_REQUIRED')
    assert.equal((await step(reviewer, 'verify', { note: 'Ý tưởng hữu ích, rõ ràng.' })).json().status, 'VERIFIED')
    assert.equal((await step(reviewer, 'approve')).json().code, 'SAME_PERSON')
    assert.equal((await step(reviewer, 'verify', { note: 'lần hai nữa nhé' })).json().code, 'INVALID_STATE')
    assert.equal((await step(admin, 'approve')).json().status, 'APPROVED')
    assert.equal((await step(owner, 'publish')).json().status, 'PUBLISHED')
    const queue = (await call(reviewer, 'GET', '/admin/contributions?queue=open&domain=ideas')).json()
    assert.equal(queue.items.some((item) => item.id === ideaId), false)
    const reviewed = (await call(reviewer, 'GET', `/admin/contributions/${ideaId}`)).json()
    assert.deepEqual(reviewed.trail.map((row) => row.action), ['SUBMITTED', 'VERIFY', 'APPROVE', 'PUBLISH'])
    assert.equal(reviewed.contribution.reviewedBy, reviewer.email)

    // Mail: real queue, no payload in the listing.
    const sent = await call(admin, 'POST', '/admin/mail/test', {})
    assert.equal(sent.statusCode, 200, sent.payload)
    const outbox = (await call(admin, 'GET', '/admin/mail')).json()
    const row = outbox.items.find((item) => item.id === sent.json().id)
    assert.equal(row.to, admin.email)
    assert.equal(row.template, 'test')
    assert.equal('payload' in row, false)
    assert.equal((await call(reviewer, 'POST', '/admin/mail/test', {})).statusCode, 403)

    // Daily tool counts feed the tools screen.
    await api.inject({ method: 'POST', url: '/api/v1/tools/visits', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip }, payload: { tool: toolId } })
    const tools = (await call(reviewer, 'GET', '/admin/tools?days=7')).json()
    assert.equal(tools.series.length, 7)
    assert.equal(tools.tools.find((item) => item.tool === toolId)?.inRange, 1)

    // Roles: grant by email, sessions end, last owner protected.
    assert.equal((await call(owner, 'PUT', '/admin/roles', { email: `nobody-${tag}@example.test`, role: 'admin' })).statusCode, 404)
    member.cookie = await signIn(member.id)
    assert.equal((await call(owner, 'PUT', '/admin/roles', { email: member.email, role: 'reviewer' })).statusCode, 200)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: member.cookie } })).json().user, null, 'granting a role ends old sessions')
    assert.equal((await call(owner, 'DELETE', `/admin/roles/${owner.id}`)).json().code, 'SELF_TARGET')
    assert.equal((await call(owner, 'DELETE', `/admin/roles/${member.id}`)).statusCode, 200)
    assert.equal((await call(admin, 'PUT', '/admin/roles', { email: member.email, role: 'owner' })).statusCode, 403)

    // Deletion: typed confirmation, then the account and its links are gone; contributions stay.
    await database.pool.execute('INSERT INTO contribution_submitters (contribution_id, user_id, attribution_consent) VALUES (?, ?, 1)', [ideaId, member.id])
    assert.equal((await call(admin, 'DELETE', `/admin/users/${member.id}`, { confirmEmail: 'wrong@example.test' })).json().code, 'CONFIRM_MISMATCH')
    assert.equal((await call(admin, 'DELETE', `/admin/users/${member.id}`, { confirmEmail: member.email })).statusCode, 200)
    const [[gone]] = await database.pool.execute('SELECT (SELECT COUNT(*) FROM users WHERE id = ?) AS users, (SELECT COUNT(*) FROM contribution_submitters WHERE user_id = ?) AS links, (SELECT COUNT(*) FROM contributions WHERE id = ?) AS kept', [member.id, member.id, ideaId])
    assert.deepEqual({ users: Number(gone.users), links: Number(gone.links), kept: Number(gone.kept) }, { users: 0, links: 0, kept: 1 })

    const audit = (await call(owner, 'GET', `/admin/audit?actor=${admin.id}`)).json()
    assert.ok(audit.items.some((item) => item.action === 'USER_DELETED' && item.detail === member.email))
  } finally {
    if (database) {
      const ids = users.map((user) => user.id)
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const row of rows) {
        await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [row.id])
        await database.pool.execute('DELETE FROM contribution_submitters WHERE contribution_id = ?', [row.id])
      }
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await database.pool.execute('DELETE FROM tool_visits WHERE tool = ?', [toolId])
      await database.pool.execute('DELETE FROM tool_visit_days WHERE tool = ?', [toolId])
      for (const key of [hmac(`contribution:${ip}`), hmac(ip)]) {
        for (const table of ['contribution_flood_events', 'contribution_flood_locks', 'visit_flood_events', 'visit_flood_locks']) await database.pool.execute(`DELETE FROM ${table} WHERE ip_hash = ?`, [key])
      }
      await database.pool.execute("DELETE FROM app_settings WHERE setting_key IN ('contributions.guestHourly', 'auth.signupOpen')")
      await database.pool.execute("DELETE FROM mail_outbox WHERE to_email LIKE ?", [`qa-%-${tag}@example.test`])
      for (const key of ['otp-ip:127.0.0.1', 'verify-ip:127.0.0.1', `otp-email:${`qa-outsider-${tag}@example.test`}`].map(hmac)) {
        await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [key])
        await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [key])
      }
      for (const id of ids) {
        for (const table of ['user_sessions', 'user_roles', 'user_plans', 'user_audit', 'contribution_submitters']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [id])
      }
    }
    await app.close()
  }
})
