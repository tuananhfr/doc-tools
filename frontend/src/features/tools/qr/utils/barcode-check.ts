import type { BarcodeCheck, BarcodeKind } from '../types/barcode.types'

/** Số kiểm tra GS1 (mod 10, trọng số 3-1-3… tính từ PHẢI sang) của dãy số chưa có số kiểm tra. */
export function gs1CheckDigit(digits: string): number {
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    const digit = Number(digits[digits.length - 1 - index])
    sum += digit * (index % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

/** Dãy GS1 đầy đủ (kể cả số kiểm tra cuối) có đúng số kiểm tra không. */
export function gs1Valid(code: string): boolean {
  return /^\d{2,}$/.test(code) && gs1CheckDigit(code.slice(0, -1)) === Number(code.at(-1))
}

const GS1_LENGTH: Partial<Record<BarcodeKind, number>> = { ean13: 13, ean8: 8, itf14: 14 }
const CODE39_CHARS = /^[0-9A-Z\-. $/+%]+$/
/** Code 128 chỉ chở ASCII in được; chữ có dấu bị bwip-js lặng lẽ mã hoá thành byte lạ — chặn ở đây. */
const CODE128_CHARS = /^[\x20-\x7e]+$/
const MAX_TEXT = 80

function gs1(kind: BarcodeKind, raw: string): BarcodeCheck {
  const full = GS1_LENGTH[kind]!
  // Người ta hay chép số có khoảng trắng / gạch nối từ bao bì.
  const digits = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) return { ok: false, reason: 'Chỉ được có chữ số.' }
  if (digits.length === full - 1) {
    const check = gs1CheckDigit(digits)
    return { ok: true, value: `${digits}${check}`, notes: [`Đã thêm số kiểm tra ${check}.`] }
  }
  if (digits.length !== full) return { ok: false, reason: `Cần ${full - 1} số (tự thêm số kiểm tra) hoặc đủ ${full} số — đang có ${digits.length}.` }
  const expected = gs1CheckDigit(digits.slice(0, -1))
  if (expected !== Number(digits.at(-1))) return { ok: false, reason: `Sai số kiểm tra: số cuối phải là ${expected}, không phải ${digits.at(-1)}. Kiểm lại số đã chép.` }
  return { ok: true, value: digits, notes: [] }
}

/** Kiểm và chuẩn hoá một giá trị trước khi vẽ thành mã; không bao giờ tự sửa số GS1 sai. */
export function checkBarcode(kind: BarcodeKind, raw: string): BarcodeCheck {
  const text = raw.trim()
  if (text === '') return { ok: false, reason: 'Chưa có nội dung.' }
  if (GS1_LENGTH[kind]) return gs1(kind, text)
  if (text.length > MAX_TEXT) return { ok: false, reason: `Dài quá ${MAX_TEXT} ký tự — mã sẽ dài quá khổ máy quét.` }

  if (kind === 'code39') {
    const upper = text.toUpperCase()
    if (!CODE39_CHARS.test(upper)) return { ok: false, reason: 'Code 39 chỉ nhận chữ không dấu, số và - . $ / + % khoảng trắng.' }
    return { ok: true, value: upper, notes: upper === text ? [] : ['Code 39 không có chữ thường — đã đổi sang chữ hoa.'] }
  }

  if (!CODE128_CHARS.test(text)) return { ok: false, reason: 'Code 128 không mã hoá được chữ có dấu hay ký tự đặc biệt. Dùng chữ không dấu.' }
  return { ok: true, value: text, notes: [] }
}

/**
 * Tiền tố GS1 đáng nói với người dùng. Không tra cứu công ty — chỉ nói điều
 * tiền tố tự nó cho biết.
 */
export function gs1PrefixNote(code: string): string | null {
  const digits = code.length === 14 ? code.slice(1) : code
  if (digits.length === 8) return null
  if (/^893/.test(digits)) return 'Tiền tố 893: mã đăng ký với GS1 Việt Nam (nơi cấp mã, không phải nơi sản xuất).'
  if (/^97[89]/.test(digits)) return 'Tiền tố 978/979: mã sách (ISBN).'
  if (/^977/.test(digits)) return 'Tiền tố 977: mã ấn phẩm định kỳ (ISSN).'
  if (/^2\d/.test(digits)) return 'Tiền tố 20–29: mã dùng nội bộ cửa hàng / doanh nghiệp, không dùng được ngoài hệ thống của mình.'
  return null
}
