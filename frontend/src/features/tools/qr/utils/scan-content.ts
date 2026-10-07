import { translate } from '@/i18n/runtime'
import type { ScanContent } from '../types/qr.types'

/** Tách một chuỗi `WIFI:` thành các trường, gỡ `\` đứng trước ký tự đặc biệt. */
function wifiFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {}
  let key = ''
  let value = ''
  let inValue = false

  for (let index = 0; index < body.length; index++) {
    const char = body[index]
    if (char === '\\' && index + 1 < body.length) {
      index++
      if (inValue) value += body[index]
      else key += body[index]
    } else if (char === ':' && !inValue) {
      inValue = true
    } else if (char === ';') {
      if (key) fields[key.toUpperCase()] = value
      key = ''
      value = ''
      inValue = false
    } else if (inValue) {
      value += char
    } else {
      key += char
    }
  }
  return fields
}

/**
 * Chuỗi đọc được có ý nghĩa gì. Chỉ `http(s)` mới được coi là đường dẫn mở
 * được: mã QR là thứ ai cũng in ra dán lên tường được, không mở giúp
 * `javascript:` hay ứng dụng lạ.
 */
export function readScanContent(text: string): ScanContent {
  const value = text.trim()

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      return { kind: 'url', href: url.href, host: url.host }
    } catch {
      return { kind: 'text' }
    }
  }

  if (/^WIFI:/i.test(value)) {
    const fields = wifiFields(value.slice(5))
    if (fields.S) return { kind: 'wifi', ssid: fields.S, password: fields.P ?? '', security: fields.T ?? '' }
  }

  if (/^tel:/i.test(value)) return { kind: 'phone', number: value.slice(4) }

  if (/^mailto:/i.test(value)) return { kind: 'email', address: value.slice(7).split('?')[0] }

  return { kind: 'text' }
}

const FORMAT_LABEL: Record<string, string> = {
  DATA_MATRIX: 'Data Matrix',
  AZTEC: 'Aztec',
  PDF_417: 'PDF417',
  EAN_13: 'EAN-13',
  EAN_8: 'EAN-8',
  UPC_A: 'UPC-A',
  UPC_E: 'UPC-E',
  CODE_128: 'Code 128',
  CODE_39: 'Code 39',
  CODE_93: 'Code 93',
  ITF: 'ITF',
  CODABAR: 'Codabar',
}

/** Tên loại mã cho người đọc; loại lạ thì in nguyên tên của thư viện. */
export function formatLabel(format: string): string {
  if (format === 'QR_CODE') return translate('qr:scanResult.qrCode')
  return FORMAT_LABEL[format] ?? format.replaceAll('_', ' ')
}
