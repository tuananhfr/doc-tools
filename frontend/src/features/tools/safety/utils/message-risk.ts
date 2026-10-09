import { translate, translateKey } from '@/i18n/runtime'

export type SignalSeverity = 'low' | 'medium' | 'high'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskSignal {
  severity: SignalSeverity
  text: string
}

export interface RiskResult {
  /** `unreadable`: chuỗi không phải một đường dẫn — không kết luận gì về rủi ro. */
  level: RiskLevel | 'unreadable'
  signals: RiskSignal[]
}

export interface Brand {
  name: string
  /** Tên viết tắt hay bị mượn trong tên miền giả ("vcb-digibank"). */
  aliases?: string[]
  /** Tên miền chính thức; tên miền con của chúng cũng là chính thức. */
  domains: string[]
}

export const BRANDS: Brand[] = [
  { name: 'vietcombank', aliases: ['vcb'], domains: ['vietcombank.com.vn'] },
  { name: 'vietinbank', domains: ['vietinbank.vn'] },
  { name: 'bidv', domains: ['bidv.com.vn'] },
  { name: 'agribank', domains: ['agribank.com.vn'] },
  { name: 'techcombank', aliases: ['tcb'], domains: ['techcombank.com', 'techcombank.com.vn'] },
  { name: 'sacombank', domains: ['sacombank.com.vn'] },
  { name: 'mbbank', domains: ['mbbank.com.vn'] },
  { name: 'vpbank', domains: ['vpbank.com.vn'] },
  { name: 'tpbank', domains: ['tpb.vn'] },
  { name: 'abbank', domains: ['abbank.vn'] },
  { name: 'acb', domains: ['acb.com.vn'] },
  { name: 'napas', domains: ['napas.com.vn'] },
  { name: 'vnpay', domains: ['vnpay.vn'] },
  { name: 'momo', domains: ['momo.vn'] },
  { name: 'zalopay', domains: ['zalopay.vn'] },
  { name: 'shopee', domains: ['shopee.vn'] },
  { name: 'vneid', domains: ['vneid.gov.vn'] },
  { name: 'dichvucong', domains: ['dichvucong.gov.vn'] },
]

export const SHORTENERS = new Set([
  'bit.ly', 'bit.do', 'tinyurl.com', 't.ly', 'is.gd', 'v.gd', 'cutt.ly', 'rb.gy', 'tiny.cc', 'bom.so', 'shorturl.at',
  's.id', 'rebrand.ly', 'ow.ly', 'buff.ly', 'goo.gl', 'gg.gg', 't.co', 'lnkd.in', 'shorturl.asia',
])

export const RISKY_TLDS = new Set([
  'xyz', 'top', 'click', 'icu', 'tk', 'gq', 'ml', 'cf', 'ga', 'monster', 'cc', 'site', 'online', 'live', 'buzz',
  'cfd', 'sbs', 'cyou', 'vip', 'win', 'bond', 'rest', 'pw',
])

// Tên miền viết trơn trong tin nhắn chỉ được nhận khi đuôi nằm ở đây: "Tp.HCM", "v.v." không phải đường dẫn.
const BARE_DOMAIN_TLDS = new Set([
  ...RISKY_TLDS, 'vn', 'com', 'net', 'org', 'info', 'biz', 'io', 'co', 'me', 'app', 'shop', 'store', 'ru', 'cn',
  'link', 'asia', 'ly', 'at', 'so', 'gd', 'id', 'gl', 'gg', 'us',
])

const WEIGHT: Record<SignalSeverity, number> = { low: 1, medium: 2, high: 4 }

/** Mức chung suy ra từ chính danh sách dấu hiệu đang hiện, để nhãn không bao giờ nói khác danh sách. */
export function levelOf(signals: RiskSignal[]): RiskLevel {
  if (!signals.length) return 'low'
  return signals.reduce((total, item) => total + WEIGHT[item.severity], 0) >= WEIGHT.high ? 'high' : 'medium'
}

const signal = (severity: SignalSeverity, key: string, options?: Record<string, string>): RiskSignal =>
  ({ severity, text: translateKey(`safety:flags.${key}`, options) })

const done = (signals: RiskSignal[]): RiskResult => ({ level: levelOf(signals), signals })
const UNREADABLE: RiskResult = { level: 'unreadable', signals: [] }

/** Bỏ dấu tiếng Việt + chữ thường: tin lừa thường cố viết không dấu để lọt bộ lọc. */
export function foldVietnamese(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

/** Khoảng cách sửa chữ, tính cả đổi chỗ hai ký tự kề nhau ("vietcmobank"). */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
    }
  }
  return rows[a.length][b.length]
}

const isUnder = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`)
export const isOfficialHost = (host: string) => host.endsWith('.gov.vn') || BRANDS.some((brand) => brand.domains.some((domain) => isUnder(host, domain)))

// Tên ngắn ("acb", "momo") chỉ khớp khi đứng thành một khúc riêng; tên dài thì dính chữ khác vẫn tính ("vietcombankvn").
const LONG_NAME = 7

function brandSignals(host: string): RiskSignal[] {
  const pieces = host.split('.').flatMap((label) => [label, ...label.split('-'), label.replace(/-/g, '')])
  const official = (brand: Brand) => brand.domains.join(', ')
  const misused = BRANDS.find((brand) => [brand.name, ...(brand.aliases ?? [])].some((name) =>
    pieces.some((piece) => piece === name || (name.length >= LONG_NAME && piece.includes(name)))))
  if (misused) return [signal('high', 'brandMisuse', { brand: misused.name, official: official(misused) })]
  // Sai 1–2 ký tự ("vietconbank") chỉ xét với tên dài: tên ngắn của các ngân hàng thật cách nhau đúng một chữ (vpbank/tpbank).
  for (const brand of BRANDS.filter((item) => item.name.length >= LONG_NAME)) {
    const limit = brand.name.length >= 9 ? 2 : 1
    for (const piece of pieces) {
      for (let size = brand.name.length - limit; size <= brand.name.length + limit; size += 1) {
        for (let start = 0; start + size <= piece.length; start += 1) {
          if (editDistance(piece.slice(start, start + size), brand.name) <= limit) {
            return [signal('high', 'lookalike', { brand: brand.name, official: official(brand) })]
          }
        }
      }
    }
  }
  return []
}

export function inspectLink(raw: string): RiskResult {
  const text = raw.trim()
  if (/^(?:javascript|vbscript|data):/i.test(text)) return done([signal('high', 'scriptLink')])
  // Có dấu cách thì là câu chữ chứ không phải đường dẫn — trước đây chữ có dấu bị đổi sang punycode và báo nhầm.
  if (!text || /\s/.test(text)) return UNREADABLE
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  let url: URL
  try { url = new URL(hasScheme ? text : `https://${text}`) } catch { return UNREADABLE }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  if (!isIp && !/^(?:[a-z0-9-]+\.)+[a-z0-9-]{2,}$/.test(host)) return UNREADABLE

  const signals: RiskSignal[] = []
  const official = isOfficialHost(host)
  if (hasScheme && url.protocol !== 'https:') signals.push(signal('low', 'noHttps'))
  if (isIp) signals.push(signal('high', 'ipHost'))
  if (host.split('.').some((label) => label.startsWith('xn--'))) signals.push(signal('medium', 'punycode'))
  if (SHORTENERS.has(host)) signals.push(signal('medium', 'shortener'))
  if (!isIp && RISKY_TLDS.has(host.split('.').at(-1) ?? '')) signals.push(signal('medium', 'riskyTld'))
  // Chỉ "gov" đứng thành khúc riêng mới tính — "govap.vn" (Gò Vấp) không phải mạo danh; ".gov" của nước khác là thật.
  const govLike = host.split(/[.-]/).some((piece) => piece === 'gov' || piece === 'govvn')
  if (govLike && !official && !/\.gov(?:\.[a-z]{2})?$/.test(host)) signals.push(signal('high', 'fakeGov'))
  if (!official && !isIp) signals.push(...brandSignals(host))
  if (!official && /(login|signin|dang-?nhap|verify|otp|xac-?thuc|xac-?minh)/i.test(url.pathname + url.search)) signals.push(signal('low', 'loginPath'))
  return done(signals)
}

export type MessageFlag = 'otp' | 'lockThreat' | 'prize' | 'easyJob' | 'urgentTransfer' | 'installApp'

// Viết trên chữ đã bỏ dấu (`foldVietnamese`), nên một mẫu bắt được cả tin có dấu lẫn không dấu.
export const MESSAGE_RULES: [RegExp, SignalSeverity, MessageFlag][] = [
  // Ngân hàng thật cũng gửi mã OTP, nên đứng một mình chỉ ở mức vừa; đi kèm dấu hiệu khác mới thành cao.
  [/\botp\b|\bma xac (?:thuc|nhan)\b/, 'medium', 'otp'],
  [/\b(?:khoa|phong toa)\b.{0,25}\btai khoan\b|\btai khoan\b.{0,40}\bbi (?:khoa|phong toa)\b/, 'medium', 'lockThreat'],
  [/\b(?:trung thuong|nhan thuong|qua tang)\b/, 'medium', 'prize'],
  [/\bviec nhe\b.{0,10}\bluong cao\b|\blam nhiem vu\b|\bchot don ao\b/, 'high', 'easyJob'],
  // Bỏ dấu thì "ngày mai", "ngày 15" cũng thành "ngay" — loại hai trường hợp đó.
  [/\b(?:chuyen khoan|nap tien)\b.{0,25}\b(?:ngay|gap)\b(?!\s*(?:mai\b|\d))/, 'medium', 'urgentTransfer'],
  // "tài khoản", "tài liệu", "tài xế" bỏ dấu cũng thành "tai".
  [/\b(?:tai(?!\s+(?:khoan|lieu|xe)\b)|cai dat|cai)\b.{0,15}\b(?:app|ung dung|apk)\b|\.apk\b/, 'high', 'installApp'],
]

const SCHEME_LINK = /(?:https?:\/\/|javascript:)[^\s<>"']+/gi
const BARE_DOMAIN = /(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,24})(?::\d{2,5})?(?:\/[^\s<>"']*)?/gi
function trimTail(link: string): string {
  let text = link.replace(/[.,;:!?'"]+$/, '')
  // Ngoặc đóng chỉ bỏ khi không có ngoặc mở đi cùng: "(xem a.vn)" khác "javascript:alert(1)".
  while (text.endsWith(')') && (text.match(/\(/g) ?? []).length < (text.match(/\)/g) ?? []).length) text = text.slice(0, -1).replace(/[.,;:!?'"]+$/, '')
  return text
}

/** Mọi đường dẫn trong tin, kể cả tên miền viết trơn không có `http://`. */
export function findLinks(text: string): string[] {
  const links = (text.match(SCHEME_LINK) ?? []).map(trimTail)
  const rest = text.replace(SCHEME_LINK, ' ')
  for (const match of rest.matchAll(BARE_DOMAIN)) {
    if (BARE_DOMAIN_TLDS.has(match[1].toLowerCase())) links.push(trimTail(match[0]))
  }
  return links
}

export function inspectMessage(text: string): RiskResult {
  const folded = foldVietnamese(text)
  const signals: RiskSignal[] = []
  for (const [pattern, severity, flag] of MESSAGE_RULES) {
    if (pattern.test(folded)) signals.push(signal(severity, flag))
  }
  for (const link of findLinks(text)) {
    const inspected = inspectLink(link)
    if (inspected.level === 'medium' || inspected.level === 'high') {
      signals.push({ severity: inspected.level, text: translate('safety:flags.link', { link, flags: inspected.signals.map((item) => item.text).join(' ') }) })
    }
  }
  return done(signals)
}
