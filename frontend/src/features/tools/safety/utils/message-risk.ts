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
  catch { return result(0, ['Không đọc được đường dẫn.']) }
  const host = url.hostname.toLowerCase()
  const parts = host.split('.')
  const flags: string[] = []
  let score = 0
  if (url.protocol !== 'https:') { score += 1; flags.push('Không dùng HTTPS.') }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) { score += 3; flags.push('Dùng địa chỉ IP thay tên miền.') }
  if (host.includes('xn--')) { score += 3; flags.push('Tên miền có mã punycode, cần đối chiếu tên thật.') }
  if (SHORTENERS.has(host)) { score += 2; flags.push('Link rút gọn che khuất đích đến.') }
  if (RISKY_TLDS.has(parts.at(-1) ?? '')) { score += 2; flags.push('Đuôi tên miền thường gặp trong các đường dẫn rủi ro.') }
  if (host.includes('gov') && !host.endsWith('.gov.vn')) { score += 3; flags.push('Có chữ gov nhưng không thuộc miền .gov.vn.') }
  const brand = BRAND_WORDS.find((word) => host.replace(/[-.]/g, '').includes(word))
  if (brand) { score += 2; flags.push(`Tên miền có chữ ${brand}; cần đối chiếu địa chỉ chính thức.`) }
  if (/(login|dang-?nhap|verify|otp|xac-?thuc)/i.test(url.pathname + url.search)) { score += 1; flags.push('Đường dẫn gợi thao tác đăng nhập hoặc xác thực.') }
  return result(score, flags)
}

const MESSAGE_PATTERNS: [RegExp, number, string][] = [
  [/otp|mã xác (thực|nhận)/i, 3, 'Yêu cầu mã OTP hoặc mã xác thực.'],
  [/(khóa|khoá|phong tỏa).{0,25}tài khoản/i, 2, 'Gây áp lực bằng nguy cơ khóa tài khoản.'],
  [/trúng thưởng|nhận thưởng|quà tặng/i, 2, 'Hứa thưởng hoặc quà tặng.'],
  [/việc nhẹ.{0,10}lương cao|làm nhiệm vụ|chốt đơn ảo/i, 3, 'Mời việc nhẹ lương cao hoặc nhiệm vụ trực tuyến.'],
  [/chuyển khoản.{0,25}(ngay|gấp)|nạp tiền.{0,25}(ngay|gấp)/i, 2, 'Giục chuyển hoặc nạp tiền gấp.'],
  [/(tải|cài).{0,15}(app|ứng dụng|apk)/i, 3, 'Yêu cầu cài ứng dụng từ tin nhắn.'],
]

export function inspectMessage(text: string): RiskResult {
  let score = 0
  const flags: string[] = []
  for (const [pattern, points, message] of MESSAGE_PATTERNS) {
    if (pattern.test(text)) { score += points; flags.push(message) }
  }
  const links = text.match(/https?:\/\/[^\s]+/gi) ?? []
  for (const link of links) {
    const inspected = inspectLink(link.replace(/[),.;]+$/, ''))
    if (inspected.level !== 'low') { score += inspected.level === 'high' ? 3 : 1; flags.push(`Link ${link}: ${inspected.flags.join(' ')}`) }
  }
  return result(score, flags)
}
