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

test('email code sign-in, session, profile, Pro capabilities and abuse limits', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const email = `qa-${randomBytes(6).toString('hex')}@example.test`
  const ip = `203.0.113.${(randomBytes(1)[0] % 250) + 1}`
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
    assert.deepEqual(guest, { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use', 'contribution.anonymous'] })

    assert.equal((await post('/auth/otp/request', { email }, { origin: 'https://site.test' })).statusCode, 403, 'custom header required')
    assert.equal((await post('/auth/otp/request', { email }, { ...write, origin: 'https://evil.test' })).statusCode, 403, 'foreign origin refused')
    assert.equal((await post('/auth/otp/request', { email: 'not-an-email' })).statusCode, 400)

    assert.deepEqual((await post('/auth/otp/request', { email: email.toUpperCase(), locale: 'vi' })).json(), { ok: true })
    const first = await latestCode()
    const [queued] = await database.pool.execute('SELECT status, payload FROM mail_outbox WHERE to_email = ? ORDER BY id DESC LIMIT 1', [email])
    assert.equal(queued[0].status, 'sent')
    assert.deepEqual(queued[0].payload, {}, 'code is scrubbed from the outbox once sent')

    const wrong = first === '000000' ? '111111' : '000000'
    assert.equal((await post('/auth/otp/verify', { email, code: wrong })).json().code, 'OTP_INVALID')
    const signedIn = await post('/auth/otp/verify', { email, code: first })
    assert.equal(signedIn.statusCode, 200, signedIn.payload)
    const setCookie = signedIn.headers['set-cookie']
    assert.match(setCookie, /^cn_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+/)
    const cookie = setCookie.split(';')[0]
    assert.equal((await post('/auth/otp/verify', { email, code: first })).statusCode, 400, 'a code works once')

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

    // Five wrong guesses kill the code even if the right one follows.
    await post('/auth/otp/request', { email })
    const second = await latestCode()
    const miss = second === '000000' ? '111111' : '000000'
    for (let index = 0; index < 5; index++) assert.equal((await post('/auth/otp/verify', { email, code: miss })).statusCode, 400)
    assert.equal((await post('/auth/otp/verify', { email, code: second })).statusCode, 400)

    assert.equal((await post('/auth/otp/request', { email })).statusCode, 200)
    assert.equal((await post('/auth/otp/request', { email })).statusCode, 429, 'three codes per email per 15 minutes')

    const out = await post('/auth/logout', {}, { ...write, cookie })
    assert.match(out.headers['set-cookie'], /Max-Age=0/)
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } })).json().user, null)
  } finally {
    if (database) {
      const [users] = await database.pool.execute('SELECT id FROM users WHERE email = ?', [email])
      for (const user of users) {
        for (const table of ['user_sessions', 'user_plans', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
      }
      await database.pool.execute('DELETE FROM users WHERE email = ?', [email])
      await database.pool.execute('DELETE FROM auth_otps WHERE email_hash = ?', [hmac(`email:${email}`)])
      await database.pool.execute('DELETE FROM mail_outbox WHERE to_email = ?', [email])
      for (const key of [`otp-email:${email}`, `otp-ip:${ip}`, `verify-ip:${ip}`]) {
        await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [hmac(key)])
        await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [hmac(key)])
      }
    }
    await app.close()
  }
})
