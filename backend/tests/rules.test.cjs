// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
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

test('applies the published package in effect today, schedules future ones and falls back on expiry or withdrawal', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const previousKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM
  process.env.RULE_SIGNING_PUBLIC_KEY_PEM = publicKey.export({ format: 'pem', type: 'spki' })
  const kind = `qa-${randomBytes(8).toString('hex')}`
  const legacyKind = `qa-${randomBytes(8).toString('hex')}`
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
    const stage = async (value, effectiveFrom, effectiveTo, packageKind = kind) => {
      const unsigned = { version: 1, kind: packageKind, keyId: 'qa', effectiveFrom, ...(effectiveTo ? { effectiveTo } : {}), publishedAt: '2026-01-01T00:00:00Z', source: { title: 'QA source', url: 'https://example.com/qa', retrievedAt: '2026-01-01T00:00:00Z', sha256: 'b'.repeat(64) }, data: { value } }
      const item = { ...unsigned, signature: sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url') }
      const { digest } = verifyRulePackage(item, process.env.RULE_SIGNING_PUBLIC_KEY_PEM)
      digests.push(digest)
      await repository.stage(item, digest, 'qa')
      return digest
    }
    const read = async (url = `/api/v1/rules/${kind}`) => {
      const body = (await api.inject({ method: 'GET', url })).json()
      return { value: body.package?.data.value ?? null, upcoming: body.upcoming?.data.value ?? null }
    }

    assert.deepEqual(await read(), { value: null, upcoming: null })
    const base = await stage(1, '2020-01-01')
    assert.deepEqual(await read(), { value: null, upcoming: null }, 'staging alone publishes nothing')
    await repository.publish(kind, base, 'qa')
    assert.deepEqual(await read(), { value: 1, upcoming: null })

    const future = await stage(99, '2099-01-01')
    await repository.publish(kind, future, 'qa')
    assert.deepEqual(await read(), { value: 1, upcoming: 99 }, 'a future package is announced, not applied')

    const expired = await stage(2, '2021-01-01', '2021-12-31')
    await repository.publish(kind, expired, 'qa')
    assert.deepEqual(await read(), { value: 1, upcoming: 99 }, 'an expired package falls back to the earlier one still in effect')

    const newer = await stage(3, '2022-01-01')
    await repository.publish(kind, newer, 'qa')
    assert.equal((await read()).value, 3, 'the latest effective date wins')
    await repository.withdraw(kind, newer, 'qa')
    assert.equal((await read()).value, 1, 'withdrawing returns to the previous package')
    await assert.rejects(repository.withdraw(kind, newer, 'qa'), /not published/)

    const [audit] = await database.pool.execute('SELECT action FROM rule_audit WHERE kind = ? ORDER BY id', [kind])
    assert.deepEqual(audit.map(row => row.action), ['stage', 'activate', 'stage', 'activate', 'stage', 'activate', 'stage', 'activate', 'rollback'])

    const legacy = await stage(7, '2020-01-01', undefined, legacyKind)
    await database.pool.execute('INSERT INTO rule_active (kind, digest) VALUES (?, ?)', [legacyKind, legacy])
    await database.onModuleInit()
    assert.equal((await read(`/api/v1/rules/${legacyKind}`)).value, 7, 'rows of the old single-pointer table are carried over')
    const [left] = await database.pool.execute('SELECT kind FROM rule_active WHERE kind = ?', [legacyKind])
    assert.equal(left.length, 0)
  } finally {
    if (database) {
      for (const item of [kind, legacyKind]) {
        await database.pool.execute('DELETE FROM rule_active WHERE kind = ?', [item])
        await database.pool.execute('DELETE FROM rule_published WHERE kind = ?', [item])
        await database.pool.execute('DELETE FROM rule_audit WHERE kind = ?', [item])
      }
      for (const digest of digests) await database.pool.execute('DELETE FROM rule_packages WHERE digest = ?', [digest])
    }
    await app.close()
    if (previousKey === undefined) delete process.env.RULE_SIGNING_PUBLIC_KEY_PEM
    else process.env.RULE_SIGNING_PUBLIC_KEY_PEM = previousKey
  }
})
