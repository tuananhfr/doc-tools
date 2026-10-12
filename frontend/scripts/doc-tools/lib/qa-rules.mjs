// Goi quy tac KY GIA cho golden: khoa Ed25519 co dinh sinh tu mot chuoi cong khai, KHONG phai khoa
// production. Chi dung o may QA:
//   NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI=$(node scripts/doc-tools/lib/qa-rules.mjs --spki) npm run build
// roi golden tra goi ky bang context.route thay cho /api/v1/rules/<kind>.
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const seed = createHash('sha256').update('chuyen-nho-qa-golden-v1').digest()
// Tien to PKCS#8 cua Ed25519: khoa rieng = 32 byte seed ngay sau.
const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' })
export const QA_RULE_SPKI = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).toString('base64url')

export const QA_SOURCE_TITLE = 'Nguon QA golden (khong phai bieu gia that)'

// Chep tu features/tools/rules/services/signed-rules.ts: ky tren dung chuoi ma trang dem di kiem.
function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  throw new Error('Invalid signed data')
}

// So lieu gia, co dinh: doi o day = doi baseline cua tien-dien / luong.
export const QA_RULE_DATA = {
  electricity: { tiers: [{ upTo: 50, price: 1000 }, { upTo: 100, price: 1500 }, { upTo: null, price: 2000 }], vatPercent: 10 },
  payroll: {
    selfDeduct: 11000000, dependentDeduct: 4400000, referenceSalary: 2340000,
    minWages: [4960000, 4410000, 3860000, 3450000],
    employee: { social: 0.08, health: 0.015, unemployment: 0.01 },
    employer: { social: 0.175, health: 0.03, unemployment: 0.01 },
    brackets: [{ upTo: 5000000, rate: 0.05 }, { upTo: 10000000, rate: 0.1 }, { upTo: 18000000, rate: 0.15 }, { upTo: 32000000, rate: 0.2 }, { upTo: 52000000, rate: 0.25 }, { upTo: 80000000, rate: 0.3 }, { upTo: null, rate: 0.35 }],
  },
}

export function signRulePackage(kind, data) {
  const unsigned = {
    version: 1, kind, keyId: 'qa-golden', effectiveFrom: '2026-01-01', publishedAt: '2026-01-01T00:00:00Z',
    source: { title: QA_SOURCE_TITLE, url: 'https://example.com/qa-rules', retrievedAt: '2026-01-01T00:00:00Z', sha256: 'a'.repeat(64) },
    data,
  }
  return { ...unsigned, signature: sign(null, Buffer.from(canonical(unsigned)), privateKey).toString('base64url') }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--spki')) console.log(QA_RULE_SPKI)
