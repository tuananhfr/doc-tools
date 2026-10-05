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
