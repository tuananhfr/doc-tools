import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { canonical, verifyRulePackage, type RulePackage } from './rule-package'
import { wardsFromCsv } from './wards-csv'

export function generateSigningKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    privatePem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    spkiBase64Url: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
  }
}

/**
 * What the operator writes by hand. Exactly one of `data`, `dataFile` or `wardsCsv`; the source
 * hash comes from `evidenceFile` (the official document as downloaded) unless given directly.
 */
interface SignSpec {
  kind: string
  keyId: string
  effectiveFrom: string
  effectiveTo?: string
  source: { title: string; url: string; retrievedAt: string; sha256?: string }
  evidenceFile?: string
  data?: unknown
  dataFile?: string
  wardsCsv?: string
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

export async function buildFromSpec(specPath: string): Promise<{ unsigned: Omit<RulePackage, 'signature'>; notes: string[] }> {
  const spec = JSON.parse(await readFile(specPath, 'utf8')) as SignSpec
  const resolve = (file: string) => path.resolve(path.dirname(specPath), file)
  const sources = [spec.data !== undefined, Boolean(spec.dataFile), Boolean(spec.wardsCsv)].filter(Boolean).length
  if (sources !== 1) throw new Error('Spec needs exactly one of data, dataFile or wardsCsv')
  const notes: string[] = []
  let data = spec.data
  if (spec.dataFile) data = JSON.parse(await readFile(resolve(spec.dataFile), 'utf8')) as unknown
  if (spec.wardsCsv) {
    const result = wardsFromCsv(await readFile(resolve(spec.wardsCsv), 'utf8'))
    data = result.data
    notes.push(`ward CSV: ${result.data.wards.length} rows kept, ${result.duplicatesRemoved} exact repeats dropped, ${result.data.provinces.length} new provinces`)
  }
  if (!spec.source || (!spec.evidenceFile && !spec.source.sha256)) throw new Error('Spec needs source plus evidenceFile (or source.sha256)')
  const evidenceHash = spec.evidenceFile ? sha256(await readFile(resolve(spec.evidenceFile))) : spec.source.sha256!
  const unsigned = {
    version: 1 as const, kind: spec.kind, keyId: spec.keyId, effectiveFrom: spec.effectiveFrom,
    ...(spec.effectiveTo ? { effectiveTo: spec.effectiveTo } : {}),
    publishedAt: new Date().toISOString(),
    source: { title: spec.source.title, url: spec.source.url, retrievedAt: spec.source.retrievedAt, sha256: evidenceHash },
    data,
  }
  return { unsigned, notes }
}

/** Signs and immediately verifies with the derived public key, so a bad envelope never leaves the CLI. */
export function signRulePackage(unsigned: Omit<RulePackage, 'signature'>, privateKeyPem: string): { item: RulePackage; digest: string } {
  const key = createPrivateKey(privateKeyPem)
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Signing key must be Ed25519')
  const signature = sign(null, Buffer.from(canonical(unsigned)), key).toString('base64url')
  const publicPem = createPublicKey(key).export({ format: 'pem', type: 'spki' }).toString()
  return verifyRulePackage({ ...unsigned, signature }, publicPem)
}
