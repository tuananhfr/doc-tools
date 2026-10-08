// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac, generateKeyPairSync, randomBytes, sign } = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { AppModule } = require('../dist/app.module')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { DatabaseService } = require('../dist/database/database.service')
const { ContributionsRepository } = require('../dist/contributions/contributions.repository')
const { RulesRepository } = require('../dist/rules/rules.repository')
const { verifyRulePackage } = require('../dist/rules/rule-package')

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

test('review requires independent operators and a signed staged package before publishing', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const domain = `qa-${randomBytes(8).toString('hex')}`
  const toolId = `qa-${randomBytes(8).toString('hex')}`
  const ip = `198.51.100.${randomBytes(1)[0] || 1}`
  const ipHash = createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`contribution:${ip}`).digest('hex')
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  let database, digest
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const input = { toolId, domain, proposedChanges: [{ field: 'sample', before: 'old', after: 'new' }], sourceRefs: [{ url: 'https://example.com/source', type: 'OFFICIAL_WEB' }] }
    assert.equal((await api.inject({ method: 'POST', url: '/api/v1/contributions', payload: input, remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip } })).statusCode, 200)
    const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
    const id = rows[0].id
    const contributions = app.get(ContributionsRepository)
    await assert.rejects(contributions.transition(id, 'approve', 'approver', null, null), /Cannot approve/)
    assert.equal(await contributions.transition(id, 'verify', 'reviewer', 'Checked official source manually', null), 'VERIFIED')
    await assert.rejects(contributions.transition(id, 'approve', 'reviewer', null, null), /Approver must differ/)
    assert.equal(await contributions.transition(id, 'approve', 'approver', null, null), 'APPROVED')
    await assert.rejects(contributions.transition(id, 'publish', 'publisher', null, 'a'.repeat(64)), /staged first/)
    const today = new Date().toISOString().slice(0, 10)
    const unsigned = { version: 1, kind: domain, keyId: 'qa', effectiveFrom: today, publishedAt: `${today}T00:00:00Z`, source: { title: 'QA source', url: 'https://example.com/source', retrievedAt: `${today}T00:00:00Z`, sha256: 'b'.repeat(64) }, data: { sample: 'new' } }
    const item = { ...unsigned, signature: sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url') }
    digest = verifyRulePackage(item, publicKey.export({ format: 'pem', type: 'spki' })).digest
    await new RulesRepository(database).stage(item, digest, 'publisher')
    await assert.rejects(contributions.transition(id, 'publish', 'approver', null, digest), /Publisher must differ/)
    await database.pool.execute('UPDATE contributions SET base_snapshot_id = ? WHERE id = ?', ['a'.repeat(64), id])
    await assert.rejects(contributions.transition(id, 'publish', 'publisher', null, digest), /Base snapshot changed/)
    await database.pool.execute('UPDATE contributions SET base_snapshot_id = NULL WHERE id = ?', [id])
    assert.equal(await contributions.transition(id, 'publish', 'publisher', null, digest), 'PUBLISHED')
    const [published] = await database.pool.execute('SELECT digest FROM rule_published WHERE kind = ?', [domain])
    assert.deepEqual(published.map((row) => row.digest), [digest])
    const [audit] = await database.pool.execute('SELECT action, actor FROM contribution_audit WHERE contribution_id = ? ORDER BY id', [id])
    assert.deepEqual(audit.map((row) => row.action), ['SUBMITTED', 'VERIFY', 'APPROVE', 'PUBLISH'])
    assert.deepEqual(audit.map((row) => row.actor), ['anonymous', 'reviewer', 'approver', 'publisher'])
  } finally {
    if (database) {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const row of rows) await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [row.id])
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await database.pool.execute('DELETE FROM rule_published WHERE kind = ?', [domain])
      await database.pool.execute('DELETE FROM rule_audit WHERE kind = ?', [domain])
      if (digest) await database.pool.execute('DELETE FROM rule_packages WHERE digest = ?', [digest])
      await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [ipHash])
      await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [ipHash])
    }
    await app.close()
  }
})

test('published ideas appear only after review and approval', async () => {
  const app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  const toolId = `qa-${randomBytes(8).toString('hex')}`
  const ip = `198.51.100.${randomBytes(1)[0] || 1}`
  const ipHash = createHmac('sha256', process.env.VISIT_HASH_SECRET).update(`contribution:${ip}`).digest('hex')
  let database
  try {
    await app.init()
    const api = app.getHttpAdapter().getInstance()
    await api.ready()
    database = app.get(DatabaseService)
    const payload = { toolId, domain: 'ideas', proposedChanges: [{ field: 'idea', before: '', after: 'Test idea' }], sourceRefs: [] }
    const submitted = await api.inject({ method: 'POST', url: '/api/v1/contributions', payload, remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': ip } })
    assert.equal(submitted.json().status, 'NEEDS_REVIEW')
    const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
    const id = rows[0].id
    const before = (await api.inject({ method: 'GET', url: '/api/v1/contributions/ideas' })).json().ideas
    assert.equal(before.some((idea) => idea.id === id), false)
    const repository = app.get(ContributionsRepository)
    await repository.transition(id, 'verify', 'reviewer', 'Checked idea for privacy', null)
    await repository.transition(id, 'approve', 'approver', null, null)
    await repository.transition(id, 'publish', 'publisher', null, null)
    const after = (await api.inject({ method: 'GET', url: '/api/v1/contributions/ideas' })).json().ideas
    assert.equal(after.find((idea) => idea.id === id)?.text, 'Test idea')
  } finally {
    if (database) {
      const [rows] = await database.pool.execute('SELECT id FROM contributions WHERE tool_id = ?', [toolId])
      for (const row of rows) await database.pool.execute('DELETE FROM contribution_audit WHERE contribution_id = ?', [row.id])
      await database.pool.execute('DELETE FROM contributions WHERE tool_id = ?', [toolId])
      await database.pool.execute('DELETE FROM contribution_flood_events WHERE ip_hash = ?', [ipHash])
      await database.pool.execute('DELETE FROM contribution_flood_locks WHERE ip_hash = ?', [ipHash])
    }
    await app.close()
  }
})
