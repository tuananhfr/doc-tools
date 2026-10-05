const { test } = require('node:test')
const assert = require('node:assert/strict')
const { generateKeyPairSync, randomBytes, sign } = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { AppModule } = require('../dist/app.module')
const { DatabaseService } = require('../dist/database/database.service')
const { RulesRepository } = require('../dist/rules/rules.repository')
const { verifyRulePackage } = require('../dist/rules/rule-package')

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

test('serves only signed active effective snapshots and can roll back', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const previousKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM
  process.env.RULE_SIGNING_PUBLIC_KEY_PEM = publicKey.export({ format: 'pem', type: 'spki' })
  const kind = `qa-${randomBytes(8).toString('hex')}`
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  let database
  const digests = []
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const repository = app.get(RulesRepository)
    const make = (value, effectiveFrom = '2026-01-01') => {
      const unsigned = { version: 1, kind, keyId: 'qa', effectiveFrom, publishedAt: '2026-01-01T00:00:00Z', source: { title: 'QA source', url: 'https://example.com/qa', retrievedAt: '2026-01-01T00:00:00Z', sha256: 'b'.repeat(64) }, data: { value } }
      const signature = sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url')
      return { ...unsigned, signature }
    }
    assert.deepEqual((await api.inject({ method: 'GET', url: `/api/v1/rules/${kind}` })).json(), { ok: true, package: null })
    const first = make(1)
    const digest1 = verifyRulePackage(first, process.env.RULE_SIGNING_PUBLIC_KEY_PEM).digest
    digests.push(digest1)
    await repository.stage(first, digest1, 'qa')
    assert.deepEqual((await api.inject({ method: 'GET', url: `/api/v1/rules/${kind}` })).json(), { ok: true, package: null })
    await repository.activate(kind, digest1, 'qa', 'activate')
    assert.equal((await api.inject({ method: 'GET', url: `/api/v1/rules/${kind}` })).json().package.data.value, 1)
    const second = make(2)
    const digest2 = verifyRulePackage(second, process.env.RULE_SIGNING_PUBLIC_KEY_PEM).digest
    digests.push(digest2)
    await repository.stage(second, digest2, 'qa')
    await repository.activate(kind, digest2, 'qa', 'activate')
    assert.equal((await api.inject({ method: 'GET', url: `/api/v1/rules/${kind}` })).json().package.data.value, 2)
    await repository.activate(kind, digest1, 'qa', 'rollback')
    assert.equal((await api.inject({ method: 'GET', url: `/api/v1/rules/${kind}` })).json().package.data.value, 1)
    const [audit] = await database.pool.execute('SELECT action FROM rule_audit WHERE kind = ? ORDER BY id', [kind])
    assert.deepEqual(audit.map(row => row.action), ['stage', 'activate', 'stage', 'activate', 'rollback'])
  } finally {
    if (database) {
      await database.pool.execute('DELETE FROM rule_active WHERE kind = ?', [kind])
      await database.pool.execute('DELETE FROM rule_audit WHERE kind = ?', [kind])
      for (const digest of digests) await database.pool.execute('DELETE FROM rule_packages WHERE digest = ?', [digest])
    }
    await app.close()
    if (previousKey === undefined) delete process.env.RULE_SIGNING_PUBLIC_KEY_PEM
    else process.env.RULE_SIGNING_PUBLIC_KEY_PEM = previousKey
  }
})
