const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash, createHmac, randomBytes, randomUUID } = require('node:crypto')
// Set before configuration() is first read; dotenv never overrides existing variables.
process.env.SITE_ORIGINS = 'https://site.test'
process.env.MAIL_TRANSPORT = 'log'
process.env.SMTP_HOST = 'env-smtp.example.test'
process.env.SMTP_USER = 'env-user'
process.env.SMTP_PASS = 'env-pass-secret'
process.env.GOCLAW_URL = 'http://env-goclaw.example.test'
process.env.GOCLAW_GATEWAY_TOKEN = 'env-token-secret'
process.env.MCP_PUBLIC_URL = ''
const KEY = `qa-config-key-${randomBytes(16).toString('hex')}`
process.env.CONFIG_ENCRYPTION_KEY = KEY
delete process.env.CONFIG_FROM_ENV_ONLY
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { configuration } = require('../dist/config/configuration')
const { runtimeConfigVersion } = require('../dist/config/runtime-config')
const { DatabaseService } = require('../dist/database/database.service')
const { hashPassword } = require('../dist/accounts/password')
const { IntegrationConfigService } = require('../dist/settings/integration-config.service')

const hmac = (value) => createHmac('sha256', process.env.VISIT_HASH_SECRET).update(value).digest('hex')
const tag = randomBytes(5).toString('hex')
const PASSWORD = `qa-owner-${tag}`

test('integration settings: owner only, password, sealed secrets, address binding, reset', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const users = []
  let database
  let saved = null
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const service = app.get(IntegrationConfigService)

    // The dev database may hold an owner's real settings: park them and put them back afterwards.
    const [settingRows] = await database.pool.query("SELECT setting_key, value, updated_by, updated_at FROM app_settings WHERE setting_key LIKE 'integration.%'")
    const [secretRows] = await database.pool.query('SELECT secret_key, sealed, updated_by, updated_at FROM app_secrets')
    saved = { settingRows, secretRows }
    await database.pool.query("DELETE FROM app_settings WHERE setting_key LIKE 'integration.%'")
    await database.pool.query('DELETE FROM app_secrets')
    await service.reload()

    async function person(name, role) {
      const id = randomUUID()
      const email = `qa-${name}-${tag}@example.test`
      await database.pool.execute('INSERT INTO users (id, email) VALUES (?, ?)', [id, email])
      if (role) await database.pool.execute('INSERT INTO user_roles (user_id, role, granted_by) VALUES (?, ?, ?)', [id, role, 'qa'])
      await database.pool.execute('INSERT INTO user_passwords (user_id, hash, updated_at) VALUES (?, ?, ?)', [id, await hashPassword(PASSWORD), Math.floor(Date.now() / 1000)])
      const token = randomBytes(32).toString('base64url')
      const now = Math.floor(Date.now() / 1000)
      await database.pool.execute('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)', [createHash('sha256').update(token).digest('hex'), id, now, now + 3600, now])
      const user = { id, email, cookie: `cn_session=${token}` }
      users.push(user)
      return user
    }
    const call = (user, method, url, payload) => api.inject({ method, url: `/api/v1${url}`, payload, remoteAddress: '127.0.0.1', headers: { cookie: user.cookie, 'x-cn-request': '1', origin: 'https://site.test' } })
    const owner = await person('owner', 'owner')
    const admin = await person('admin', 'admin')
    const reviewer = await person('reviewer', 'reviewer')

    const mailValues = (changes = {}) => ({ transport: 'smtp', from: 'contact@lpc.vn', fromName: 'Chuyện Nhỏ', heloName: '', smtpHost: 'env-smtp.example.test', smtpPort: 587, smtpSecure: false, smtpUser: 'env-user', dkimDomain: '', dkimSelector: '', ...changes })
    const goclawValues = (changes = {}) => ({ url: 'http://env-goclaw.example.test', publicWsUrl: '', publicFilesUrl: '', mcpPublicUrl: '', mcpAllowedIps: [], ...changes })

    // Owner only; values from .env are shown, secrets only as "set".
    assert.equal((await call(admin, 'GET', '/admin/integrations')).json().code, 'FORBIDDEN')
    const first = await call(owner, 'GET', '/admin/integrations')
    assert.equal(first.statusCode, 200)
    assert.equal(first.json().mail.source, 'env')
    assert.equal(first.json().mail.values.smtpHost, 'env-smtp.example.test')
    assert.equal(first.json().mail.secrets.smtpPassword.source, 'env')
    assert.equal(first.json().encryptionReady, true)
    assert.ok(!first.body.includes('env-pass-secret') && !first.body.includes('env-token-secret'), 'secrets never leave the server')

    // Every write asks the password again.
    assert.equal((await call(owner, 'PUT', '/admin/integrations/mail', { values: mailValues() })).json().code, 'PASSWORD_WRONG')
    assert.equal((await call(owner, 'PUT', '/admin/integrations/mail', { password: 'nope', values: mailValues() })).json().code, 'PASSWORD_WRONG')
    assert.equal((await call(admin, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values: mailValues() })).json().code, 'FORBIDDEN')

    // Input checks.
    for (const [values, why] of [
      [mailValues({ smtpHost: '' }), 'smtp needs a host'], [mailValues({ transport: 'carrier-pigeon' }), 'unknown transport'],
      [mailValues({ smtpPort: 70000 }), 'port range'], [mailValues({ from: 'not-an-email' }), 'sender'], [mailValues({ dkimSelector: 'Bad!' }), 'selector'],
    ]) assert.equal((await call(owner, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values })).json().code, 'INVALID_INPUT', why)
    for (const [values, why] of [
      [goclawValues({ url: 'ftp://goclaw.example.test' }), 'scheme'], [goclawValues({ url: 'http://user:pw@goclaw.example.test' }), 'credentials in URL'],
      [goclawValues({ mcpPublicUrl: 'https://site.test/api/v1/mcp' }), 'MCP path'], [goclawValues({ mcpAllowedIps: ['10.0.0.300'] }), 'IP'],
    ]) assert.equal((await call(owner, 'PUT', '/admin/integrations/goclaw', { password: PASSWORD, values })).json().code, 'INVALID_INPUT', why)

    // A new SMTP host while a password is in use: the password must be typed again.
    const required = await call(owner, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values: mailValues({ smtpHost: 'smtp.qa.example.test' }) })
    assert.equal(required.json().code, 'SECRET_REQUIRED')
    assert.equal(configuration().mail.smtp.host, 'env-smtp.example.test', 'nothing saved')

    const versionBefore = runtimeConfigVersion()
    const savedMail = await call(owner, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values: mailValues({ smtpHost: 'smtp.qa.example.test', smtpPort: 465, smtpSecure: true }), secrets: { smtpPassword: 'ui-pass-secret' } })
    assert.equal(savedMail.statusCode, 200)
    assert.equal(savedMail.json().mail.source, 'ui')
    assert.equal(savedMail.json().mail.secrets.smtpPassword.source, 'ui')
    assert.ok(!savedMail.body.includes('ui-pass-secret'))
    assert.ok(runtimeConfigVersion() > versionBefore, 'the mail transport is rebuilt')
    assert.deepEqual({ ...configuration().mail.smtp }, { host: 'smtp.qa.example.test', port: 465, secure: true, user: 'env-user', pass: 'ui-pass-secret' })
    const [[sealedRow]] = await database.pool.query("SELECT sealed FROM app_secrets WHERE secret_key = 'mail.smtpPassword'")
    assert.ok(sealedRow.sealed.startsWith('v1.') && !sealedRow.sealed.includes('ui-pass-secret'), 'stored sealed')
    const [[auditRow]] = await database.pool.query("SELECT detail FROM admin_audit WHERE actor_id = ? AND action = 'INTEGRATION_CHANGED' ORDER BY id DESC LIMIT 1", [owner.id])
    assert.match(auditRow.detail, /smtpHost/)
    assert.match(auditRow.detail, /mail\.smtpPassword=set/)
    assert.ok(!auditRow.detail.includes('ui-pass-secret'))

    // Removing the admin-set password does not bring back the .env one for a host .env never named.
    await call(owner, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values: mailValues({ smtpHost: 'smtp.qa.example.test' }), secrets: { smtpPassword: null } })
    assert.equal(configuration().mail.smtp.pass, '')
    assert.equal((await call(owner, 'GET', '/admin/integrations')).json().mail.secrets.smtpPassword.source, null)

    // Mail check only applies to SMTP, and the queue's admin role may run it.
    await call(owner, 'PUT', '/admin/integrations/mail', { password: PASSWORD, values: mailValues({ transport: 'log', smtpHost: 'smtp.qa.example.test' }) })
    assert.equal((await call(admin, 'POST', '/admin/integrations/mail/verify')).json().code, 'NOT_SMTP')

    // DKIM keys are generated on the server; only the DNS record comes back.
    assert.equal((await call(owner, 'POST', '/admin/integrations/mail/dkim', { password: PASSWORD, selector: 'Bad!' })).json().code, 'INVALID_INPUT')
    const dkim = (await call(owner, 'POST', '/admin/integrations/mail/dkim', { password: PASSWORD, selector: 'qa1' })).json()
    assert.equal(dkim.record.host, 'qa1._domainkey.lpc.vn')
    assert.match(dkim.record.value, /^v=DKIM1; k=rsa; p=[A-Za-z0-9+/=]+$/)
    assert.equal(dkim.mail.dkimRecord.value, dkim.record.value)
    assert.equal(configuration().mail.dkim.selector, 'qa1')
    assert.match(configuration().mail.dkim.privateKey, /^-----BEGIN PRIVATE KEY-----/)
    assert.ok(!JSON.stringify(dkim).includes('PRIVATE KEY'))

    // GoClaw: same address binding for the gateway token.
    assert.equal((await call(owner, 'PUT', '/admin/integrations/goclaw', { password: PASSWORD, values: goclawValues({ url: 'https://goclaw.qa.example.test' }) })).json().code, 'SECRET_REQUIRED')
    const savedGoclaw = await call(owner, 'PUT', '/admin/integrations/goclaw', { password: PASSWORD, values: goclawValues({ url: 'https://goclaw.qa.example.test', publicWsUrl: 'wss://ws.qa.example.test/ws', mcpAllowedIps: ['10.0.0.1', '10.0.0.1'] }), secrets: { gatewayToken: 'ui-token-secret' } })
    assert.equal(savedGoclaw.statusCode, 200)
    assert.deepEqual(savedGoclaw.json().goclaw.values.mcpAllowedIps, ['10.0.0.1'])
    assert.equal(configuration().goclaw.gatewayToken, 'ui-token-secret')
    assert.equal(configuration().goclaw.publicWsUrl, 'wss://ws.qa.example.test/ws')

    // A changed CONFIG_ENCRYPTION_KEY: the sealed token no longer opens, and the .env one is not sent to the new address.
    process.env.CONFIG_ENCRYPTION_KEY = `${KEY}-rotated`
    await service.reload()
    assert.equal((await call(owner, 'GET', '/admin/integrations')).json().goclaw.secrets.gatewayToken.readable, false)
    assert.equal(configuration().goclaw.gatewayToken, '')
    delete process.env.CONFIG_ENCRYPTION_KEY
    assert.equal((await call(owner, 'PUT', '/admin/integrations/goclaw', { password: PASSWORD, values: goclawValues({ url: 'https://goclaw.qa.example.test' }), secrets: { gatewayToken: 'x' } })).json().code, 'ENCRYPTION_KEY_MISSING')
    process.env.CONFIG_ENCRYPTION_KEY = KEY
    await service.reload()
    assert.equal(configuration().goclaw.gatewayToken, 'ui-token-secret')

    // The break-glass switch ignores the admin form.
    process.env.CONFIG_FROM_ENV_ONLY = '1'
    assert.equal(configuration().goclaw.url, 'http://env-goclaw.example.test')
    assert.equal(configuration().goclaw.gatewayToken, 'env-token-secret')
    delete process.env.CONFIG_FROM_ENV_ONLY

    // MCP registration from the admin area: ai.manage only; a missing MCP address is reported, not sent.
    assert.equal((await call(reviewer, 'POST', '/admin/ai/mcp/register')).json().code, 'FORBIDDEN')
    const register = await call(admin, 'POST', '/admin/ai/mcp/register')
    assert.equal(register.statusCode, 502)
    assert.match(register.json().message, /mcp\/sse/)

    // Reset goes back to .env, secrets included.
    assert.equal((await call(owner, 'DELETE', '/admin/integrations/goclaw', { password: 'nope' })).json().code, 'PASSWORD_WRONG')
    const reset = await call(owner, 'DELETE', '/admin/integrations/goclaw', { password: PASSWORD })
    assert.equal(reset.json().goclaw.source, 'env')
    assert.equal(reset.json().goclaw.secrets.gatewayToken.source, 'env')
    assert.equal(configuration().goclaw.gatewayToken, 'env-token-secret')
    const [[{ remaining }]] = await database.pool.query("SELECT COUNT(*) AS remaining FROM app_secrets WHERE secret_key = 'goclaw.gatewayToken'")
    assert.equal(Number(remaining), 0)
  } finally {
    if (database) {
      await database.pool.query("DELETE FROM app_settings WHERE setting_key LIKE 'integration.%'")
      await database.pool.query('DELETE FROM app_secrets')
      if (saved) {
        for (const row of saved.settingRows) await database.pool.execute('INSERT INTO app_settings (setting_key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)', [row.setting_key, JSON.stringify(row.value), row.updated_by, row.updated_at])
        for (const row of saved.secretRows) await database.pool.execute('INSERT INTO app_secrets (secret_key, sealed, updated_by, updated_at) VALUES (?, ?, ?, ?)', [row.secret_key, row.sealed, row.updated_by, row.updated_at])
      }
      for (const user of users) {
        for (const table of ['user_sessions', 'user_roles', 'user_passwords', 'user_audit']) await database.pool.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id])
        await database.pool.execute('DELETE FROM admin_audit WHERE actor_id = ?', [user.id])
        for (const table of ['auth_flood_events', 'auth_flood_locks']) await database.pool.execute(`DELETE FROM ${table} WHERE key_hash = ?`, [hmac(`password-check:${user.id}`)])
        await database.pool.execute('DELETE FROM users WHERE id = ?', [user.id])
      }
    }
    await app.close()
  }
})
