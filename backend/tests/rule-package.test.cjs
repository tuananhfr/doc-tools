const { test } = require('node:test')
const assert = require('node:assert/strict')
const { generateKeyPairSync, sign } = require('node:crypto')
const { verifyRulePackage } = require('../dist/rules/rule-package')

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

test('accepts a valid Ed25519 package and rejects altered rules', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const unsigned = { version: 1, kind: 'electricity', keyId: 'test', effectiveFrom: '2026-01-01', publishedAt: '2025-12-01T00:00:00Z', source: { title: 'Test source', url: 'https://example.com/source', retrievedAt: '2025-12-01T00:00:00Z', sha256: 'a'.repeat(64) }, data: { tiers: [100, 200] } }
  const signature = sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url')
  const key = publicKey.export({ format: 'pem', type: 'spki' })
  const valid = { ...unsigned, signature }
  assert.match(verifyRulePackage(valid, key).digest, /^[0-9a-f]{64}$/)
  assert.throws(() => verifyRulePackage({ ...valid, data: { tiers: [100, 300] } }, key), /signature/)
})

test('a package signed by the pre-sourceId CLI still verifies', () => {
  const { readFileSync } = require('node:fs')
  const { join } = require('node:path')
  const fixtures = join(__dirname, 'fixtures')
  const legacy = JSON.parse(readFileSync(join(fixtures, 'rule-package-legacy.json'), 'utf8'))
  const pem = readFileSync(join(fixtures, 'rule-signing-fixture.pub.pem'), 'utf8')
  assert.equal('sourceId' in legacy, false)
  const { item, digest } = verifyRulePackage(legacy, pem)
  assert.equal(item.kind, 'electricity')
  assert.match(digest, /^[0-9a-f]{64}$/)
  assert.throws(() => verifyRulePackage({ ...legacy, effectiveFrom: '2025-01-02' }, pem), /signature is invalid/)
})
