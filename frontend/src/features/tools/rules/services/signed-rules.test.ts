import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash, createPublicKey, generateKeyPairSync, sign, webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fetchVerifiedRules, formatRuleDate, signedRuleDigest, SOURCE_ID_PATTERN, verifySignedRulePackage, vietnamToday, type SignedRulePackage } from './signed-rules'

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const key = publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')

function signed(effectiveFrom: string, data: unknown, effectiveTo?: string): SignedRulePackage {
  const unsigned = { version: 1 as const, kind: 'electricity', keyId: 'test', effectiveFrom, ...(effectiveTo ? { effectiveTo } : {}), publishedAt: '2026-01-01T00:00:00Z', source: { title: 'Test', url: 'https://example.com', retrievedAt: '2026-01-01T00:00:00Z', sha256: 'a'.repeat(64) }, data }
  return { ...unsigned, signature: sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url') }
}

const parseTiers = (data: unknown) => data && typeof data === 'object' && Array.isArray((data as { tiers?: unknown }).tiers) ? data as { tiers: number[] } : null

function serve(body: unknown, status = 200) {
  vi.stubEnv('NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI', key)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('verifySignedRulePackage', () => {
  it('checks the signature, kind, and effective date', async () => {
    const item = signed('2026-01-01', { tiers: [100] })
    const { signature: _signature, ...unsigned } = item
    expect(await verifySignedRulePackage(item, key, 'electricity', '2026-10-05')).toBe(true)
    expect(await signedRuleDigest(item)).toBe(createHash('sha256').update(canonical(unsigned)).digest('hex'))
    expect(await verifySignedRulePackage({ ...item, data: { tiers: [200] } }, key, 'electricity', '2026-10-05')).toBe(false)
    expect(await verifySignedRulePackage(item, key, 'payroll', '2026-10-05')).toBe(false)
    expect(await verifySignedRulePackage(item, key, 'electricity', '2025-01-01')).toBe(false)
  })
})

describe('vietnamToday', () => {
  it('turns over at midnight in Vietnam, not UTC', () => {
    expect(vietnamToday(new Date('2026-12-31T16:59:59Z'))).toBe('2026-12-31')
    expect(vietnamToday(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01')
    expect(formatRuleDate('2027-01-01')).toBe('01/01/2027')
  })
})

describe('fetchVerifiedRules', () => {
  it('returns the package in effect together with the upcoming one', async () => {
    serve({ ok: true, package: signed('2026-01-01', { tiers: [1] }), upcoming: signed('2027-01-01', { tiers: [2] }) })
    const result = await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')
    expect(result.state).toBe('ready')
    if (result.state !== 'ready') return
    expect(result.current.data).toEqual({ tiers: [1] })
    expect(result.upcoming?.effectiveFrom).toBe('2027-01-01')
  })
  it('tells "nothing published" apart from a broken package and an unreachable server', async () => {
    serve({ ok: true, package: null, upcoming: signed('2027-01-01', { tiers: [2] }) })
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toMatchObject({ state: 'none', upcoming: { effectiveFrom: '2027-01-01' } })
    serve({ ok: true, package: { ...signed('2026-01-01', { tiers: [1] }), data: { tiers: [9] } }, upcoming: null })
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toEqual({ state: 'invalid' })
    serve({ ok: true, package: signed('2026-01-01', { wrong: true }), upcoming: null })
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toEqual({ state: 'invalid' })
    serve({ ok: true, package: signed('2026-01-01', { tiers: [1] }, '2026-06-30'), upcoming: null })
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toEqual({ state: 'invalid' })
    serve({ ok: false }, 503)
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toEqual({ state: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toEqual({ state: 'unavailable' })
  })
  it('drops a broken upcoming package without hiding the current one', async () => {
    serve({ ok: true, package: signed('2026-01-01', { tiers: [1] }), upcoming: { ...signed('2027-01-01', { tiers: [2] }), signature: 'AAAA' } })
    expect(await fetchVerifiedRules('electricity', parseTiers, '2026-10-06')).toMatchObject({ state: 'ready', upcoming: null })
  })
})

const FIXTURES = fileURLToPath(new URL('../../../../../../backend/tests/fixtures/', import.meta.url))
const fixture = (name: string) => JSON.parse(readFileSync(FIXTURES + name, 'utf8')) as SignedRulePackage
const fixtureKey = createPublicKey(readFileSync(FIXTURES + 'rule-signing-fixture.pub.pem', 'utf8')).export({ format: 'der', type: 'spki' }).toString('base64url')

describe('packages from the backend CLI (with and without sourceId)', () => {
  function serveFixture(item: SignedRulePackage) {
    vi.stubEnv('NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI', fixtureKey)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, package: item, upcoming: null }))))
  }

  it('verifies a package signed before sourceId existed', async () => {
    serveFixture(fixture('rule-package-legacy.json'))
    const result = await fetchVerifiedRules('electricity', parseTiers, '2026-10-12')
    expect(result.state).toBe('ready')
    if (result.state === 'ready') expect(result.current.sourceId).toBeUndefined()
  })

  it('verifies a package carrying a sourceId and exposes it', async () => {
    serveFixture(fixture('rule-package-source-id.json'))
    const result = await fetchVerifiedRules('electricity', parseTiers, '2026-10-12')
    expect(result.state).toBe('ready')
    if (result.state === 'ready') expect(result.current.sourceId).toBe('qa-fixture-source')
  })

  it('rejects a tampered or malformed sourceId', async () => {
    serveFixture({ ...fixture('rule-package-source-id.json'), sourceId: 'qa-other-source' })
    expect((await fetchVerifiedRules('electricity', parseTiers, '2026-10-12')).state).toBe('invalid')
    serveFixture({ ...fixture('rule-package-source-id.json'), sourceId: 'Bad Id' })
    expect((await fetchVerifiedRules('electricity', parseTiers, '2026-10-12')).state).toBe('invalid')
  })

  it('uses the same id pattern as the backend', () => {
    expect(SOURCE_ID_PATTERN.test('evn-2025-05')).toBe(true)
    expect(SOURCE_ID_PATTERN.test('-bad')).toBe(false)
    expect(SOURCE_ID_PATTERN.test('ab')).toBe(false)
    expect(SOURCE_ID_PATTERN.test('a'.repeat(65))).toBe(false)
  })
})
