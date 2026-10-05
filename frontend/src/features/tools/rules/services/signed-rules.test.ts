import { describe, expect, it } from 'vitest'
import { createHash, generateKeyPairSync, sign, webcrypto } from 'node:crypto'
import { signedRuleDigest, verifySignedRulePackage, type SignedRulePackage } from './signed-rules'

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
}

describe('verifySignedRulePackage', () => {
  it('checks the signature, kind, and effective date', async () => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const unsigned = { version: 1 as const, kind: 'electricity', keyId: 'test', effectiveFrom: '2026-01-01', publishedAt: '2026-01-01T00:00:00Z', source: { title: 'Test', url: 'https://example.com', retrievedAt: '2026-01-01T00:00:00Z', sha256: 'a'.repeat(64) }, data: { tiers: [100] } }
    const signature = sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url')
    const item: SignedRulePackage = { ...unsigned, signature }
    const key = publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')
    expect(await verifySignedRulePackage(item, key, 'electricity', '2026-10-05')).toBe(true)
    expect(await signedRuleDigest(item)).toBe(createHash('sha256').update(canonical(unsigned)).digest('hex'))
    expect(await verifySignedRulePackage({ ...item, data: { tiers: [200] } }, key, 'electricity', '2026-10-05')).toBe(false)
    expect(await verifySignedRulePackage(item, key, 'payroll', '2026-10-05')).toBe(false)
    expect(await verifySignedRulePackage(item, key, 'electricity', '2025-01-01')).toBe(false)
  })
})
