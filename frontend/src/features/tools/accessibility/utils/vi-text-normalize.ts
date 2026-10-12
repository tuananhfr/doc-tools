/**
 * Chuẩn hoá văn bản tiếng Việt trước khi đưa cho espeak-ng: espeak đọc chữ viết tắt bằng âm vị
 * tiếng Anh ("UBND" → "ʌbnd"), đọc số điện thoại thành số lớn và bỏ chữ "tháng" trong "31/12".
 * Chỉ dùng cho giọng Piper; giọng của máy có bộ chuẩn hoá riêng.
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

const LETTERS: Record<string, string> = {
  A: 'a', B: 'bê', C: 'xê', D: 'dê', Đ: 'đê', E: 'e', F: 'ép', G: 'giê', H: 'hát', I: 'i', J: 'gi', K: 'ca', L: 'e lờ',
  M: 'em mờ', N: 'en nờ', O: 'o', P: 'pê', Q: 'quy', R: 'e rờ', S: 'ét', T: 'tê', U: 'u', V: 'vê', W: 'vê kép', X: 'ích', Y: 'i dài', Z: 'dét',
}

// `\b` của JS chỉ hiểu chữ ASCII: "VNĐ" kết thúc bằng Đ nên `\bVNĐ\b` không bao giờ khớp.
const word = (source: string, flags = 'gu') => new RegExp(`(?<![\\p{L}\\d])(?:${source})(?![\\p{L}\\d])`, flags)

/** Viết tắt có nghĩa cố định; mục dài đứng trước để "NĐ-CP" không bị tách thành hai chữ đánh vần. */
const ABBREVIATIONS: [RegExp, string][] = [
  [word('TP\\.?\\s*HCM|TPHCM'), 'thành phố Hồ Chí Minh'],
  [word('NĐ-CP'), 'nghị định chính phủ'],
  [word('QĐ-TTg'), 'quyết định thủ tướng'],
  [word('UBND'), 'ủy ban nhân dân'],
  [word('HĐND'), 'hội đồng nhân dân'],
  [word('BHXH'), 'bảo hiểm xã hội'],
  [word('BHYT'), 'bảo hiểm y tế'],
  [word('BHTN'), 'bảo hiểm thất nghiệp'],
  [word('CCCD'), 'căn cước công dân'],
  [word('CMND'), 'chứng minh nhân dân'],
  [word('THPT'), 'trung học phổ thông'],
  [word('THCS'), 'trung học cơ sở'],
  [word('GTGT'), 'giá trị gia tăng'],
  [word('SĐT'), 'số điện thoại'],
  [word('STT'), 'số thứ tự'],
  [word('VNĐ|VND'), 'đồng'],
  [/(?<![\p{L}\d])v\.v\.?/gu, 'vân vân'],
  // "TP." / "Q." / "P." chỉ là địa danh khi theo sau là tên hoặc số, tránh nuốt chữ cái đầu tên người.
  [/(?<![\p{L}\d])(?:TP|Tp)\.?\s+(?=[\p{Lu}\d])/gu, 'thành phố '],
  [/(?<![\p{L}\d])Q\.\s*(?=[\p{Lu}\d])/gu, 'quận '],
  [/(?<![\p{L}\d])P\.\s*(?=[\p{Lu}\d])/gu, 'phường '],
  [word('VN'), 'Việt Nam'],
]

const INITIALS = 'b|c|ch|d|đ|g|gh|gi|h|k|kh|l|m|n|ng|ngh|nh|p|ph|qu|r|s|t|th|tr|v|x'
const VIETNAMESE_SYLLABLE = new RegExp(`^(?:${INITIALS})?[aeiouy]{1,3}(?:c|ch|m|n|ng|nh|p|t)?$`)
const ROMAN_NUMERAL = /^(?=[MDCLXVI])M{0,3}(?:C[MD]|D?C{0,3})(?:X[CL]|L?X{0,3})(?:I[XV]|V?I{0,3})$/

/** Cụm chữ hoa không đọc được như một âm tiết tiếng Việt thì đánh vần ("ATM" → "a tê em mờ"); "QUYẾT" chỉ hạ chữ thường. */
function readCapitals(capitals: string): string {
  if (ROMAN_NUMERAL.test(capitals)) return capitals
  const bare = capitals.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (VIETNAMESE_SYLLABLE.test(bare)) return capitals.toLowerCase()
  return ` ${Array.from(capitals, (letter) => LETTERS[letter] ?? letter).join(' ')} `
}

const readDigits = (digits: string) => Array.from(digits, (digit) => DIGITS[Number(digit)]).join(' ')

function readPhone(match: string): string {
  const digits = match.replace(/\D/g, '')
  return ` ${match.startsWith('+84') ? `cộng tám tư ${readDigits(digits.slice(2))}` : readDigits(digits)} `
}

function readAddress(match: string): string {
  // `\S+` của URL nuốt luôn dấu chấm hết câu; trả dấu đó lại để không mất chỗ ngắt câu.
  const ending = /[.,;:]+$/.exec(match)?.[0] ?? ''
  const spoken = match.slice(0, match.length - ending.length).replace(/^https?:\/\//i, '').replace(/\/$/, '')
    .replace(/@/g, ' a còng ').replace(/\./g, ' chấm ').replace(/_/g, ' gạch dưới ').replace(/-/g, ' gạch ngang ').replace(/\//g, ' gạch chéo ')
  return ` ${spoken}${ending} `
}

const inRange = (value: string, min: number, max: number) => Number(value) >= min && Number(value) <= max

export function normalizeVietnameseText(text: string): string {
  let result = text.normalize('NFC')
  result = result.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+|https?:\/\/\S+|www\.\S+/gi, readAddress)
  result = result.replace(/(?<![\d.,])(?:\+84[ .-]?|0)\d(?:[ .-]?\d){8,9}(?![\d.,]\d)/g, readPhone)
  for (const [pattern, replacement] of ABBREVIATIONS) result = result.replace(pattern, replacement)
  // "ngày 05/09/2026" đã có chữ "ngày" sẵn thì giữ nguyên chữ đó, không đọc thành "ngày ngày".
  result = result.replace(/((?:[Nn]gày)\s+)?(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?!\d)/g, (match, said = 'ngày ', day, month, year) =>
    inRange(day, 1, 31) && inRange(month, 1, 12) ? `${said}${Number(day)} tháng ${Number(month)} năm ${year}` : match)
  result = result.replace(/((?:[Tt]háng)\s+)?(?<![\d/])(\d{1,2})\/(\d{4})(?![\d/])/g, (match, said = 'tháng ', month, year) =>
    inRange(month, 1, 12) ? `${said}${Number(month)} năm ${year}` : match)
  result = result.replace(/((?:[Nn]gày)\s+)?(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/g, (match, said = 'ngày ', day, month) =>
    inRange(day, 1, 31) && inRange(month, 1, 12) ? `${said}${Number(day)} tháng ${Number(month)}` : match)
  result = result.replace(/(?<![\d:])(\d{1,2})[h:](\d{2})(?![\d:])/g, (match, hour, minute) =>
    inRange(hour, 0, 23) && inRange(minute, 0, 59) ? `${Number(hour)} giờ ${Number(minute)} phút` : match)
  result = result.replace(/(?<!\d)(\d{1,2})h(?![\p{L}\d])/gu, (match, hour) => inRange(hour, 0, 24) ? `${Number(hour)} giờ` : match)
  result = result.replace(/(\d)\s*(?:đ|₫)(?![\p{L}\d])/gu, '$1 đồng')
  result = result.replace(/(\d)\s*(?:m2|m²)(?![\p{L}\d])/gu, '$1 mét vuông')
  result = result.replace(/(\d)\s*km(?![\p{L}\d])/gu, '$1 ki lô mét').replace(/(\d)\s*kg(?![\p{L}\d])/gu, '$1 ki lô gam')
  result = result.replace(/(?<!\p{L})\p{Lu}[\p{Lu}\p{M}]+(?!\p{L})/gu, readCapitals)
  result = result.replace(/\s*&\s*/g, ' và ').replace(/\//g, ' ').replace(/…|\.{3,}/g, '.')
  return result.replace(/[ \t]+/g, ' ').replace(/ ([,.!?;:])/g, '$1').trim()
}
