import type { QrForm } from '../types/qr.types'
import { translate } from '@/i18n/runtime'

const MAX_LABEL = 40

/** Phần nhận ra được của nội dung: tên miền, tên Wi-Fi, số điện thoại… */
function labelOf(form: QrForm): string {
  switch (form.kind) {
    case 'url':
      return form.url
        .trim()
        .replace(/^[a-z][a-z0-9+.-]*:\/*/i, '')
        .split(/[/?#]/)[0]
    case 'text':
      return form.text.trim().split(/\r?\n/)[0]
    case 'wifi':
      return form.ssid.trim()
    case 'phone':
      return form.phone.trim()
    case 'email':
      return form.email.trim()
    case 'vcard':
      return form.contactName.trim()
  }
}

/** Tên tệp tải về (chưa có đuôi) — kèm nội dung để mười mã tải liền không thành "Mã QR (9)". */
export function qrFileName(form: QrForm): string {
  const label = safeLabel(labelOf(form))
  const prefix = translate('qr:file.qr')
  return label ? `${prefix} - ${label}` : prefix
}

/** Tên tệp của một mã vạch: chính giá trị trong mã — lô 500 mã giải nén ra là tìm được ngay. */
export function barcodeFileName(value: string): string {
  const label = safeLabel(value)
  const prefix = translate('qr:file.barcode')
  return label ? `${prefix} - ${label}` : prefix
}

function safeLabel(text: string): string {
  return text
    // Ký tự Windows không cho đặt tên tệp, và ký tự điều khiển.
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL)
    // Windows lặng lẽ bỏ dấu chấm / khoảng trắng cuối tên.
    .replace(/[. ]+$/, '')
}
