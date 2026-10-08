// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac, randomBytes } = require('node:crypto')
// Must be set before configuration() is first read; dotenv never overrides existing variables.
process.env.MAIL_TRANSPORT = 'log'
process.env.SITE_ORIGINS = 'https://site.test'
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')
const { MailService } = require('../dist/mail/mail.service')
const { PlansRepository } = require('../dist/accounts/plans.repository')
const { loggedMails } = require('../dist/mail/mail-transport')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')

test('password sign-up and sign-in, reset by email code, sessions, profile, Pro capabilities and abuse limits', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const email = `qa-${randomBytes(6).toString('hex')}@example.test`
  const ip = `203.0.113.${(randomBytes(1)[0] % 250) + 1}`
  const otherIp = `198.51.100.${(randomBytes(1)[0] % 250) + 1}`
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const mail = app.get(MailService)
    const write = { 'x-cn-request': '1', origin: 'https://site.test', 'x-forwarded-for': ip }
    const post = (url, payload, headers = write) => api.inject({ method: 'POST', url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1', headers })
    const latestCode = async () => {
      await mail.processDue()
      const sent = loggedMails.filter((item) => item.to === email).at(-1)
      assert.ok(sent, 'code email was delivered through the log transport')
      return /\b(\d{6})\b/.exec(sent.text)[1]
    }

    const guest = (await api.inject({ method: 'GET', url: '/api/v1/me' })).json()
    assert.deepEqual(guest, { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use', 'contribution.anonymous'], staff: null })

    assert.equal((await post('/auth/otp/request', { email }, { origin: 'https://site.test' })).statusCode, 403, 'custom header required')
    assert.equal((await post('/auth/otp/request', { email }, { ...write, origin: 'https://evil.test' })).statusCode, 403, 'foreign origin refused')
    assert.equal((await post('/auth/otp/request', { email: 'not-an-email' })).statusCode, 400)

    assert.deepEqual((await post('/auth/otp/request', { email: email.toUpperCase(), locale: 'vi' })).json(), { ok: true })
    const first = await latestCode()
    const [queued] = await database.pool.execute('SELECT status, payload FROM mail_outbox WHERE to_email = ? ORDER BY id DESC LIMIT 1', [email])
    assert.equal(queued[0].status, 'sent')
    assert.deepEqual(queued[0].payload, {}, 'code is scrubbed from the outbox once sent')

    const password = 'mây trắng bay qua đồi'
    const wrong = first === '000000' ? '111111' : '000000'
    assert.equal((await post('/auth/otp/verify', { email, code: first })).statusCode, 404, 'a code alone no longer signs anyone in')
    assert.equal((await post('/auth/password/setup', { email, code: wrong, password })).json().code, 'OTP_INVALID')
    for (const [weak, code] of [['ngắn', 'PASSWORD_TOO_SHORT'], ['x'.repeat(129), 'PASSWORD_TOO_LONG'], ['Password123', 'PASSWORD_COMMON'], [email, 'PASSWORD_COMMON']]) {
      assert.equal((await post('/auth/password/setup', { email, code: first, password: weak })).json().code, code)
    }
    const signedUp = await post('/auth/password/setup', { email, code: first, password })
    assert.equal(signedUp.statusCode, 200, `a rejected password does not spend the code: ${signedUp.payload}`)
    assert.equal(signedUp.json().user.hasPassword, true)
    assert.match(signedUp.headers['set-cookie'], /^cn_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+/)
    assert.equal((await post('/auth/password/setup', { email, code: first, password })).statusCode, 400, 'a code works once')

    const login = (payload) => post('/auth/login', payload)
    const failed = await login({ email, password: 'không phải mật khẩu' })
    assert.deepEqual([failed.statusCode, failed.json().code], [401, 'LOGIN_FAILED'])
    const unknown = await login({ email: `nobody-${randomBytes(4).toString('hex')}@example.test`, password })
    assert.deepEqual([unknown.statusCode, unknown.json().code], [401, 'LOGIN_FAILED'], 'unknown email answers exactly like a wrong password')
    assert.equal((await login({ email, password: 'x'.repeat(1100) })).json().code, 'LOGIN_FAILED', 'over 1024 characters is never hashed')
    assert.equal((await login({ email, password: { $ne: null } })).json().code, 'LOGIN_FAILED')
    // NFD input (macOS keyboards) must match the NFC password set above.
    const signedIn = await login({ email: email.toUpperCase(), password: password.normalize('NFD') })
    assert.equal(signedIn.statusCode, 200, signedIn.payload)
    const cookie = signedIn.headers['set-cookie'].split(';')[0]
    const otherDevice = (await login({ email, password })).headers['set-cookie'].split(';')[0]

    const me = (await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } })).json()
    assert.equal(me.user.email, email)
    assert.equal(me.plan.pro, false)
    assert.ok(me.capabilities.includes('contribution.attributed'))
    assert.ok(!me.capabilities.includes('ai.agent'))

    const patch = (payload, headers) => api.inject({ method: 'PATCH', url: '/api/v1/me', payload, remoteAddress: '127.0.0.1', headers })
    assert.equal((await patch({ displayName: 'An', publicAttribution: true }, { cookie })).statusCode, 403)
    assert.equal((await patch({ displayName: 'An', publicAttribution: true }, write)).statusCode, 401)
    assert.equal((await patch({ displayName: '<b>', publicAttribution: true }, { ...write, cookie })).statusCode, 400)
    const updated = (await patch({ displayName: '  Nguyễn   An ', publicAttribution: true }, { ...write, cookie })).json()
    assert.equal(updated.user.displayName, 'Nguyễn An')
    assert.equal(updated.user.publicAttribution, true)

    const plans = app.get(PlansRepository)
    const now = Math.floor(Date.now() / 1000)
    await plans.grant(me.user.id, now + 3600, 'qa', null, now)
    const pro = (await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } })).json()
    assert.equal(pro.plan.pro, true)
    assert.ok(pro.capabilities.includes('ai.agent') && pro.capabilities.includes('cloud.memory'))
    assert.equal(await plans.revoke(me.user.id, now), 1)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } })).json().plan.pro, false)

    const meWith = async (value) => (await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: value } })).json().user
    const put = (url, payload, headers) => api.inject({ method: 'PUT', url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1', headers })
    const next = 'một mật khẩu mới'
    assert.equal((await put('/me/password', { currentPassword: password, newPassword: next }, write)).statusCode, 401)
    assert.equal((await put('/me/password', { currentPassword: 'sai rồi nhé', newPassword: next }, { ...write, cookie })).json().code, 'PASSWORD_WRONG')
    assert.equal((await put('/me/password', { currentPassword: password, newPassword: '12345678' }, { ...write, cookie })).json().code, 'PASSWORD_COMMON')
    const changed = await put('/me/password', { currentPassword: password, newPassword: next }, { ...write, cookie })
    assert.deepEqual(changed.json(), { ok: true, ended: 2 }, 'changing the password signs out the sign-up session and the other device')
    assert.ok(await meWith(cookie), 'this device stays signed in')
    assert.equal(await meWith(otherDevice), null)
    assert.equal(await meWith(signedUp.headers['set-cookie'].split(';')[0]), null)
    assert.equal((await login({ email, password })).statusCode, 401, 'old password stops working')
    const third = (await login({ email, password: next })).headers['set-cookie'].split(';')[0]
    assert.deepEqual((await post('/me/sessions/end-others', {}, { ...write, cookie })).json(), { ok: true, ended: 1 })
    assert.equal(await meWith(third), null)
    assert.equal((await post('/me/sessions/end-others', {}, write)).statusCode, 401)

    // Forgot password: the code resets it and signs out every device, including this one.
    await post('/auth/otp/request', { email })
    const reset = await latestCode()
    const resetDone = await post('/auth/password/setup', { email, code: reset, password: 'đặt lại lần nữa' })
    assert.equal(resetDone.statusCode, 200, resetDone.payload)
    assert.equal(await meWith(cookie), null)
    const [audit] = await database.pool.execute("SELECT action FROM user_audit WHERE user_id = ? AND action LIKE 'PASSWORD_%' ORDER BY id", [me.user.id])
    assert.deepEqual(audit.map((row) => row.action), ['PASSWORD_SET', 'PASSWORD_CHANGED', 'PASSWORD_RESET'])
    const fresh = resetDone.headers['set-cookie'].split(';')[0]

    // Five wrong guesses kill the code even if the right one follows.
    await post('/auth/otp/request', { email })
    const second = await latestCode()
    const miss = second === '000000' ? '111111' : '000000'
    for (let index = 0; index < 5; index++) assert.equal((await post('/auth/password/setup', { email, code: miss, password: 'mật khẩu thứ tư' })).statusCode, 400)
    assert.equal((await post('/auth/password/setup', { email, code: second, password: 'mật khẩu thứ tư' })).statusCode, 400)
    assert.equal((await post('/auth/otp/request', { email })).statusCode, 429, 'three codes per email per 15 minutes')

    // Ten misses from one address hold back that email + address pair; there is no lockout of the account itself.
    for (let index = 0; index < 10; index++) await login({ email, password: `đoán sai ${index}` })
    assert.equal((await login({ email, password: 'đặt lại lần nữa' })).statusCode, 429)
    const elsewhere = await post('/auth/login', { email, password: 'đặt lại lần nữa' }, { ...write, 'x-forwarded-for': otherIp })
    assert.equal(elsewhere.statusCode, 200, 'the owner can still sign in from another network')

    const out = await post('/auth/logout', {}, { ...write, cookie: fresh })
    assert.match(out.headers['set-cookie'], /Max-Age=0/)
    assert.equal(await meWith(fresh), null)
  } finally {
    if (database) {
      const [users] = await database.pool.execute('SELECT id FROM users WHERE email = ?', [email])
      for (const user of users) {
        for (const table of ['user_sessions', 'user_plans', 'user_audit', 'user_passwords']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
      }
      await database.pool.execute('DELETE FROM users WHERE email = ?', [email])
      await database.pool.execute('DELETE FROM auth_otps WHERE email_hash = ?', [hmac(`email:${email}`)])
      await database.pool.execute('DELETE FROM mail_outbox WHERE to_email = ?', [email])
      const keys = [`otp-email:${email}`, `otp-ip:${ip}`, `verify-ip:${ip}`, `login-email:${email}`]
      for (const address of [ip, otherIp]) keys.push(`login-ip:${address}`, `login-email-ip:${email}:${address}`)
      for (const user of users) keys.push(`password-check:${user.id}`)
      for (const key of keys) {
        await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [hmac(key)])
        await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [hmac(key)])
      }
    }
    await app.close()
  }
})
