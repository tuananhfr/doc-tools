// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto')
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
const { loggedMails } = require('../dist/mail/mail-transport')
const { hashPassword } = require('../dist/accounts/password')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')
const tag = randomBytes(5).toString('hex')
const PASSWORD = 'mây trắng bay qua đồi'

test('changing the sign-in email: self-service with a code, and by an admin for support', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  const emails = new Set()
  const ip = `192.0.2.${(randomBytes(1)[0] % 250) + 1}`
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const mail = app.get(MailService)
    const address = (name) => { const email = `qa-${name}-${tag}@example.test`; emails.add(email); return email }

    async function signIn(id) {
      const token = randomBytes(32).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      return `cn_session=${token}`
    }
    async function person(name, { role = null, password = PASSWORD } = {}) {
      const id = randomUUID()
      const email = address(name)
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, email])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      if (password) await database.pool.execute('INSERT INTO user_passwords (user_id, hash, updated_at) VALUES (?, ?, ?)', [id, await hashPassword(password), 0])
      const user = { id, email, cookie: await signIn(id) }
      users.push(user)
      return user
    }
    const call = (user, method, url, payload) => api.inject({
      method, url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1',
      headers: { ...(user ? { cookie: user.cookie } : {}), 'x-cn-request': '1', origin: 'https://site.test', 'x-forwarded-for': ip },
    })
    const mailsTo = async (to) => { await mail.processDue(); return loggedMails.filter((item) => item.to === to) }
    const sessionCount = async (id) => Number((await database.pool.execute('SELECT COUNT(*) AS n FROM user_sessions WHERE user_id = ?', [id]))[0][0].n)
    const audit = async (id) => (await database.pool.execute('SELECT action, actor, note FROM user_audit WHERE user_id = ? ORDER BY id', [id]))[0]

    // --- Self-service ---
    const member = await person('member')
    const otherDevice = await signIn(member.id)
    const taken = await person('taken')
    const noPassword = await person('nopass', { password: null })
    const oldEmail = member.email
    const newEmail = address('moved')

    assert.equal((await call(null, 'POST', '/me/email', { email: newEmail, password: PASSWORD })).statusCode, 401)
    assert.equal((await call(member, 'POST', '/me/email', { email: 'not-an-email', password: PASSWORD })).json().code, 'EMAIL_INVALID')
    assert.equal((await call(member, 'POST', '/me/email', { email: oldEmail.toUpperCase(), password: PASSWORD })).json().code, 'EMAIL_SAME')
    assert.equal((await call(member, 'POST', '/me/email', { email: newEmail, password: 'sai mật khẩu' })).json().code, 'PASSWORD_WRONG')
    assert.equal((await call(noPassword, 'POST', '/me/email', { email: newEmail, password: PASSWORD })).json().code, 'PASSWORD_NOT_SET')
    assert.equal((await call(member, 'POST', '/me/email/confirm', { code: '123456' })).json().code, 'OTP_INVALID', 'nothing pending yet')

    // A sign-up/reset code still live for the old address must die with the move.
    assert.equal((await call(null, 'POST', '/auth/otp/request', { email: oldEmail, locale: 'vi' })).statusCode, 200)

    const requested = await call(member, 'POST', '/me/email', { email: newEmail.toUpperCase(), password: PASSWORD, locale: 'vi' })
    assert.deepEqual(requested.json(), { ok: true }, requested.payload)
    const [codeMail] = await mailsTo(newEmail)
    assert.equal(codeMail.subject, 'Mã xác nhận đổi email Chuyện Nhỏ')
    const code = /\b(\d{6})\b/.exec(codeMail.text)[1]
    assert.equal((await database.pool.execute('SELECT email FROM users WHERE id = ?', [member.id]))[0][0].email, oldEmail, 'nothing changes before the code')

    const wrong = code === '000000' ? '111111' : '000000'
    assert.equal((await call(member, 'POST', '/me/email/confirm', { code: wrong })).json().code, 'OTP_INVALID')
    assert.equal((await call(member, 'POST', '/me/email/confirm', { code: 'abc' })).json().code, 'OTP_INVALID')
    const confirmed = await call(member, 'POST', '/me/email/confirm', { code })
    assert.equal(confirmed.statusCode, 200, confirmed.payload)
    assert.equal(confirmed.json().user.email, newEmail)
    assert.equal(confirmed.json().ended, 1, 'the other device was signed out')
    member.email = newEmail
    assert.equal(await sessionCount(member.id), 1, 'this device stays signed in')
    assert.equal((await api.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie: otherDevice } })).json().user, null)
    assert.equal((await call(member, 'POST', '/me/email/confirm', { code })).json().code, 'OTP_INVALID', 'a code works once')

    const [notice] = await mailsTo(oldEmail).then((list) => list.filter((item) => item.subject.startsWith('Email đăng nhập Chuyện Nhỏ đã đổi')))
    assert.ok(notice, 'the old address is told')
    assert.match(notice.text, /q\*\*\*@example\.test/)
    assert.ok(!notice.text.includes(newEmail), 'the old mailbox never learns the full new address')
    assert.deepEqual((await audit(member.id)).filter((row) => row.action === 'EMAIL_CHANGED'), [{ action: 'EMAIL_CHANGED', actor: 'self', note: null }])
    const [otps] = await database.pool.execute('SELECT consumed_at FROM auth_otps WHERE email_hash = ?', [hmac(`email:${oldEmail}`)])
    assert.ok(otps.length && otps.every((row) => row.consumed_at !== null), 'old-address codes are void')

    const login = (email) => call(null, 'POST', '/auth/login', { email, password: PASSWORD })
    assert.equal((await login(newEmail)).statusCode, 200)
    assert.equal((await login(oldEmail)).json().code, 'LOGIN_FAILED')

    // A taken address is revealed only once the code proves the mailbox; the email stays put.
    assert.deepEqual((await call(member, 'POST', '/me/email', { email: taken.email, password: PASSWORD })).json(), { ok: true })
    const takenCode = /\b(\d{6})\b/.exec((await mailsTo(taken.email)).at(-1).text)[1]
    const clash = await call(member, 'POST', '/me/email/confirm', { code: takenCode })
    assert.deepEqual([clash.statusCode, clash.json().code], [409, 'EMAIL_TAKEN'])
    assert.equal((await database.pool.execute('SELECT email FROM users WHERE id = ?', [member.id]))[0][0].email, newEmail)

    // --- Admin, for someone who lost the old mailbox ---
    const owner = await person('owner', { role: 'owner' })
    const admin = await person('admin', { role: 'admin' })
    const reviewer = await person('reviewer', { role: 'reviewer' })
    const staffTarget = await person('staff', { role: 'admin' })
    const customer = await person('customer')
    await signIn(customer.id)
    const target = address('rescued')
    const change = (actor, user, payload) => call(actor, 'POST', `/admin/users/${user.id}/email`, payload)
    const valid = { email: target, reason: 'Mất hộp thư cũ, xác minh qua hoá đơn', password: PASSWORD }

    assert.equal((await change(reviewer, customer, valid)).json().code, 'FORBIDDEN')
    assert.equal((await change(admin, admin, valid)).json().code, 'SELF_TARGET')
    assert.equal((await change(admin, staffTarget, valid)).json().code, 'STAFF_TARGET')
    assert.equal((await change(admin, customer, { ...valid, email: 'nope' })).json().code, 'EMAIL_INVALID')
    assert.equal((await change(admin, customer, { ...valid, reason: '  ' })).json().code, 'NOTE_REQUIRED')
    assert.equal((await change(admin, customer, { ...valid, reason: 'x'.repeat(301) })).statusCode, 400)
    assert.equal((await change(admin, customer, { ...valid, email: customer.email })).json().code, 'EMAIL_SAME')
    assert.equal((await change(admin, customer, { ...valid, email: taken.email })).json().code, 'EMAIL_TAKEN')
    assert.equal((await change(admin, customer, { ...valid, password: 'sai' })).json().code, 'PASSWORD_WRONG')
    assert.equal((await database.pool.execute('SELECT email FROM users WHERE id = ?', [customer.id]))[0][0].email, customer.email, 'refusals change nothing')

    const done = await change(admin, customer, valid)
    assert.equal(done.statusCode, 200, done.payload)
    assert.equal(done.json().user.email, target)
    assert.equal(await sessionCount(customer.id), 0, 'every session ends')
    const [oldNotice] = await mailsTo(customer.email)
    assert.match(oldNotice.text, /Quản trị viên Chuyện Nhỏ vừa đổi email/)
    assert.ok(!oldNotice.text.includes(target))
    const [newNotice] = await mailsTo(target)
    assert.match(newNotice.text, /\/dang-nhap\?mode=reset/)
    const [[record]] = await database.pool.execute("SELECT detail FROM admin_audit WHERE action = 'USER_EMAIL_CHANGED' AND target_id = ?", [customer.id])
    assert.equal(record.detail, `${customer.email} → ${target}: ${valid.reason}`)
    assert.deepEqual((await audit(customer.id)).filter((row) => row.action === 'EMAIL_CHANGED'), [{ action: 'EMAIL_CHANGED', actor: admin.email, note: null }])
    customer.email = target

    // The owner may move a staff account; the support path then lets that person reset the password.
    assert.equal((await change(owner, staffTarget, { ...valid, email: address('staff-new') })).statusCode, 200)
  } finally {
    if (database) {
      const ids = users.map((user) => user.id)
      for (const id of ids) {
        for (const table of ['user_sessions', 'user_roles', 'user_passwords', 'user_audit', 'email_changes']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ? OR target_id = ?', [id, id])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [id])
        for (const key of [`password-check:${id}`, `email-change:${id}`]) {
          await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [hmac(key)])
          await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [hmac(key)])
        }
      }
      for (const email of emails) {
        await database.pool.execute('DELETE FROM auth_otps WHERE email_hash = ?', [hmac(`email:${email}`)])
        await database.pool.execute('DELETE FROM mail_outbox WHERE to_email = ?', [email])
        for (const key of [`otp-email:${email}`, `login-email:${email}`, `login-email-ip:${email}:${ip}`]) {
          await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [hmac(key)])
          await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [hmac(key)])
        }
      }
      for (const key of [`otp-ip:${ip}`, `email-change-ip:${ip}`, `email-verify-ip:${ip}`, `login-ip:${ip}`]) {
        await database.pool.execute('DELETE FROM auth_flood_events WHERE key_hash = ?', [hmac(key)])
        await database.pool.execute('DELETE FROM auth_flood_locks WHERE key_hash = ?', [hmac(key)])
      }
    }
    await app.close()
  }
})
