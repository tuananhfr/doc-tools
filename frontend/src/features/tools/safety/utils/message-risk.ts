import { translate } from '@/i18n/runtime'

export interface RiskResult {
  score: number
  level: 'low' | 'medium' | 'high'
  flags: string[]
}

const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.ly', 'is.gd', 'cutt.ly', 'rb.gy', 'tiny.cc'])
const BRAND_WORDS = ['vietcombank', 'bidv', 'vietinbank', 'agribank', 'techcombank', 'vneid', 'napas', 'momo']
const RISKY_TLDS = new Set(['xyz', 'top', 'click', 'icu', 'tk', 'gq', 'monster'])

function result(score: number, flags: string[]): RiskResult {
  return { score, level: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low', flags }
}

export function inspectLink(raw: string): RiskResult {
  let url: URL
  try { url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`) }
  catch { return result(0, [translate('safety:flags.unreadable')]) }
  const host = url.hostname.toLowerCase()
  const parts = host.split('.')
  const flags: string[] = []
  let score = 0
  if (url.protocol !== 'https:') { score += 1; flags.push(translate('safety:flags.noHttps')) }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) { score += 3; flags.push(translate('safety:flags.ipHost')) }
  if (host.includes('xn--')) { score += 3; flags.push(translate('safety:flags.punycode')) }
  if (SHORTENERS.has(host)) { score += 2; flags.push(translate('safety:flags.shortener')) }
  if (RISKY_TLDS.has(parts.at(-1) ?? '')) { score += 2; flags.push(translate('safety:flags.riskyTld')) }
  if (host.includes('gov') && !host.endsWith('.gov.vn')) { score += 3; flags.push(translate('safety:flags.fakeGov')) }
  const brand = BRAND_WORDS.find((word) => host.replace(/[-.]/g, '').includes(word))
  if (brand) { score += 2; flags.push(translate('safety:flags.brand', { brand })) }
  if (/(login|dang-?nhap|verify|otp|xac-?thuc)/i.test(url.pathname + url.search)) { score += 1; flags.push(translate('safety:flags.loginPath')) }
  return result(score, flags)
}

type MessageFlag = 'otp' | 'lockThreat' | 'prize' | 'easyJob' | 'urgentTransfer' | 'installApp'

const MESSAGE_PATTERNS: [RegExp, number, MessageFlag][] = [
  [/otp|mã xác (thực|nhận)/i, 3, 'otp'],
  [/(khóa|khoá|phong tỏa).{0,25}tài khoản/i, 2, 'lockThreat'],
  [/trúng thưởng|nhận thưởng|quà tặng/i, 2, 'prize'],
  [/việc nhẹ.{0,10}lương cao|làm nhiệm vụ|chốt đơn ảo/i, 3, 'easyJob'],
  [/chuyển khoản.{0,25}(ngay|gấp)|nạp tiền.{0,25}(ngay|gấp)/i, 2, 'urgentTransfer'],
  [/(tải|cài).{0,15}(app|ứng dụng|apk)/i, 3, 'installApp'],
]

export function inspectMessage(text: string): RiskResult {
  let score = 0
  const flags: string[] = []
  for (const [pattern, points, flag] of MESSAGE_PATTERNS) {
    if (pattern.test(text)) { score += points; flags.push(translate(`safety:flags.${flag}`)) }
  }
  const links = text.match(/https?:\/\/[^\s]+/gi) ?? []
  for (const link of links) {
    const inspected = inspectLink(link.replace(/[),.;]+$/, ''))
    if (inspected.level !== 'low') { score += inspected.level === 'high' ? 3 : 1; flags.push(translate('safety:flags.link', { link, flags: inspected.flags.join(' ') })) }
  }
  return result(score, flags)
}
