import { createHash, createPublicKey, verify } from 'node:crypto'

export interface RulePackage {
  version: 1
  kind: string
  keyId: string
  effectiveFrom: string
  effectiveTo?: string
  publishedAt: string
  source: { title: string; url: string; retrievedAt: string; sha256: string }
  data: unknown
  signature: string
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    if (entries.some(([, item]) => item === undefined)) throw new Error('Undefined values are not signable')
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  }
  throw new Error('Unsupported value in rule package')
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password }
  catch { return false }
}

export function parseRulePackage(value: unknown): RulePackage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Rule package must be an object')
  const item = value as Record<string, unknown>
  const keys = Object.keys(item).sort()
  if (keys.join(',') !== ['data', 'effectiveFrom', 'effectiveTo', 'keyId', 'kind', 'publishedAt', 'signature', 'source', 'version'].filter(key => key !== 'effectiveTo' || item.effectiveTo !== undefined).sort().join(',')) throw new Error('Rule package fields are invalid')
  if (item.version !== 1 || typeof item.kind !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(item.kind)) throw new Error('Invalid rule kind or version')
  if (typeof item.keyId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.keyId)) throw new Error('Invalid key ID')
  if (!isDate(item.effectiveFrom) || (item.effectiveTo !== undefined && (!isDate(item.effectiveTo) || item.effectiveTo < item.effectiveFrom))) throw new Error('Invalid effective dates')
  if (typeof item.publishedAt !== 'string' || Number.isNaN(Date.parse(item.publishedAt))) throw new Error('Invalid publication date')
  if (!item.source || typeof item.source !== 'object' || Array.isArray(item.source)) throw new Error('Invalid source')
  const source = item.source as Record<string, unknown>
  if (Object.keys(source).sort().join(',') !== 'retrievedAt,sha256,title,url' || typeof source.title !== 'string' || source.title.length < 2 || source.title.length > 300 || !isHttpsUrl(source.url) || typeof source.retrievedAt !== 'string' || Number.isNaN(Date.parse(source.retrievedAt)) || typeof source.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(source.sha256)) throw new Error('Invalid source evidence')
  if (typeof item.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(item.signature)) throw new Error('Invalid Ed25519 signature')
  if (item.data === undefined || canonical(item.data).length > 1_000_000) throw new Error('Invalid rule data')
  return item as unknown as RulePackage
}

export function rulePackageDigest(item: RulePackage): string {
  const { signature: _signature, ...unsigned } = item
  return createHash('sha256').update(canonical(unsigned)).digest('hex')
}

export function verifyRulePackage(value: unknown, publicKeyPem: string): { item: RulePackage; digest: string } {
  const item = parseRulePackage(value)
  const { signature, ...unsigned } = item
  const key = createPublicKey(publicKeyPem)
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, Buffer.from(canonical(unsigned)), key, Buffer.from(signature, 'base64url'))) throw new Error('Rule package signature is invalid')
  return { item, digest: rulePackageDigest(item) }
}
