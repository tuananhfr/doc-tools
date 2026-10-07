import { translate } from '@/i18n/runtime'
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
  if (!/^\d+$/.test(digits)) return { ok: false, reason: translate('qr:check.digitsOnly') }
  if (digits.length === full - 1) {
    const check = gs1CheckDigit(digits)
    return { ok: true, value: `${digits}${check}`, notes: [translate('qr:check.checkDigitAdded', { digit: check })] }
  }
  if (digits.length !== full) return { ok: false, reason: translate('qr:check.wrongLength', { short: full - 1, full, count: digits.length }) }
  const expected = gs1CheckDigit(digits.slice(0, -1))
  if (expected !== Number(digits.at(-1))) return { ok: false, reason: translate('qr:check.wrongCheckDigit', { expected, actual: digits.at(-1) }) }
  return { ok: true, value: digits, notes: [] }
}

/** Kiểm và chuẩn hoá một giá trị trước khi vẽ thành mã; không bao giờ tự sửa số GS1 sai. */
export function checkBarcode(kind: BarcodeKind, raw: string): BarcodeCheck {
  const text = raw.trim()
  if (text === '') return { ok: false, reason: translate('qr:check.empty') }
  if (GS1_LENGTH[kind]) return gs1(kind, text)
  if (text.length > MAX_TEXT) return { ok: false, reason: translate('qr:check.tooLong', { max: MAX_TEXT }) }

  if (kind === 'code39') {
    const upper = text.toUpperCase()
    if (!CODE39_CHARS.test(upper)) return { ok: false, reason: translate('qr:check.code39Chars') }
    return { ok: true, value: upper, notes: upper === text ? [] : [translate('qr:check.code39Upper')] }
  }

  if (!CODE128_CHARS.test(text)) return { ok: false, reason: translate('qr:check.code128Chars') }
  return { ok: true, value: text, notes: [] }
}

/**
 * Tiền tố GS1 đáng nói với người dùng. Không tra cứu công ty — chỉ nói điều
 * tiền tố tự nó cho biết.
 */
export function gs1PrefixNote(code: string): string | null {
  const digits = code.length === 14 ? code.slice(1) : code
  if (digits.length === 8) return null
  if (/^893/.test(digits)) return translate('qr:check.prefix893')
  if (/^97[89]/.test(digits)) return translate('qr:check.prefixIsbn')
  if (/^977/.test(digits)) return translate('qr:check.prefixIssn')
  if (/^2\d/.test(digits)) return translate('qr:check.prefixInternal')
  return null
}
