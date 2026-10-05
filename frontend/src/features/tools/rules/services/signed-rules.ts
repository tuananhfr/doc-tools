import { withBase } from '@/utils/url'

export interface SignedRulePackage<T = unknown> {
  version: 1
  kind: string
  keyId: string
  effectiveFrom: string
  effectiveTo?: string
  publishedAt: string
  source: { title: string; url: string; retrievedAt: string; sha256: string }
  data: T
  signature: string
}

export interface VerifiedRulePackage<T = unknown> extends SignedRulePackage<T> { digest: string }

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  throw new Error('Invalid signed data')
}

function decodeBase64Url(input: string): Uint8Array {
  const raw = atob(input.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export async function verifySignedRulePackage<T>(value: SignedRulePackage<T>, spkiBase64Url: string, expectedKind: string, today = new Date().toISOString().slice(0, 10)): Promise<boolean> {
  if (value.version !== 1 || value.kind !== expectedKind || value.effectiveFrom > today || (value.effectiveTo && value.effectiveTo < today)) return false
  try {
    const { signature, ...unsigned } = value
    const key = await crypto.subtle.importKey('spki', decodeBase64Url(spkiBase64Url) as BufferSource, { name: 'Ed25519' }, false, ['verify'])
    return crypto.subtle.verify('Ed25519', key, decodeBase64Url(signature) as BufferSource, new TextEncoder().encode(canonical(unsigned)))
  } catch { return false }
}

export async function signedRuleDigest<T>(value: SignedRulePackage<T>): Promise<string> {
  const { signature: _signature, ...unsigned } = value
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(unsigned)))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function fetchVerifiedRules<T>(kind: string): Promise<VerifiedRulePackage<T> | null> {
  const key = process.env.NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI
  if (!key || !/^[a-z][a-z0-9-]{0,63}$/.test(kind)) return null
  const response = await fetch(withBase(`/api/v1/rules/${kind}`), { cache: 'no-store' })
  if (!response.ok) return null
  const envelope = await response.json() as { ok?: unknown; package?: SignedRulePackage<T> | null }
  if (envelope.ok !== true || !envelope.package) return null
  if (!await verifySignedRulePackage(envelope.package, key, kind)) return null
  return { ...envelope.package, digest: await signedRuleDigest(envelope.package) }
}

