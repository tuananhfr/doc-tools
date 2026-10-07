import { translate } from '@/i18n/runtime'
import type { QrForm, QrPayload } from '../types/qr.types'

export const INITIAL_QR_FORM: QrForm = {
  kind: 'url',
  url: '',
  text: '',
  ssid: '',
  password: '',
  security: 'WPA',
  hidden: false,
  phone: '',
  email: '',
  subject: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactOrg: '',
  contactTitle: '',
}

const EMPTY: QrPayload = { ok: false, reason: null }

const fail = (reason: string): QrPayload => ({ ok: false, reason })

/** Ký tự có nghĩa riêng trong chuỗi `WIFI:` phải thêm `\` phía trước. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

function urlPayload(input: string): QrPayload {
  const url = input.trim()
  if (!url) return EMPTY
  if (/\s/.test(url)) return fail(translate('qr:payload.urlSpaces'))
  // Thiếu "https://" thì nhiều máy quét coi là chữ thường, không mời mở trang.
  return { ok: true, text: /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}` }
}

function wifiPayload(form: QrForm): QrPayload {
  const ssid = form.ssid.trim()
  if (!ssid) return EMPTY
  const hidden = form.hidden ? 'H:true;' : ''
  if (form.security === 'nopass') return { ok: true, text: `WIFI:T:nopass;S:${escapeWifi(ssid)};${hidden};` }
  if (!form.password) return fail(translate('qr:payload.wifiPassword'))
  if (form.security === 'WPA' && form.password.length < 8) return fail(translate('qr:payload.wpaShort'))
  return { ok: true, text: `WIFI:T:${form.security};S:${escapeWifi(ssid)};P:${escapeWifi(form.password)};${hidden};` }
}

/** Số đã gọt còn chữ số (và dấu + đầu); `reason` khi không phải số điện thoại. */
function readPhone(raw: string): { number: string } | { reason: string } {
  if (!/^\+?[\d\s().-]+$/.test(raw)) return { reason: translate('qr:payload.phoneChars') }
  const digits = raw.replace(/[^\d]/g, '')
  if (digits.length < 3) return { reason: translate('qr:payload.phoneShort') }
  return { number: `${raw.startsWith('+') ? '+' : ''}${digits}` }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function phonePayload(input: string): QrPayload {
  const raw = input.trim()
  if (!raw) return EMPTY
  const phone = readPhone(raw)
  return 'reason' in phone ? fail(phone.reason) : { ok: true, text: `tel:${phone.number}` }
}

/** Ký tự có nghĩa riêng trong giá trị vCard; xuống dòng phải viết thành chữ `\n`. */
export function escapeVcard(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

/**
 * vCard 3.0 — bản mà máy ảnh của cả iOS lẫn Android đều mời "Thêm vào danh bạ".
 * Cả họ tên nằm ở ô đầu của `N`: tên người Việt không tách họ / tên một cách
 * máy móc được, còn tên hiển thị thì danh bạ lấy từ `FN`.
 */
function vcardPayload(form: QrForm): QrPayload {
  const name = form.contactName.trim()
  const rawPhone = form.contactPhone.trim()
  const email = form.contactEmail.trim()
  if (!name && !rawPhone && !email) return EMPTY
  if (!name) return fail(translate('qr:payload.contactName'))
  if (!rawPhone && !email) return fail(translate('qr:payload.contactReach'))

  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVcard(name)};;;;`, `FN:${escapeVcard(name)}`]
  const org = form.contactOrg.trim()
  const title = form.contactTitle.trim()
  if (org) lines.push(`ORG:${escapeVcard(org)}`)
  if (title) lines.push(`TITLE:${escapeVcard(title)}`)
  if (rawPhone) {
    const phone = readPhone(rawPhone)
    if ('reason' in phone) return fail(phone.reason)
    lines.push(`TEL;TYPE=CELL:${phone.number}`)
  }
  if (email) {
    if (!EMAIL.test(email)) return fail(translate('qr:payload.email'))
    lines.push(`EMAIL:${email}`)
  }
  lines.push('END:VCARD')
  return { ok: true, text: lines.join('\r\n') }
}

function emailPayload(form: QrForm): QrPayload {
  const address = form.email.trim()
  if (!address) return EMPTY
  if (!EMAIL.test(address)) return fail(translate('qr:payload.email'))
  const subject = form.subject.trim()
  return { ok: true, text: `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}` }
}

/** Chuỗi sẽ nằm trong mã QR, dựng từ các ô nhập của loại đang chọn. */
export function buildPayload(form: QrForm): QrPayload {
  switch (form.kind) {
    case 'url':
      return urlPayload(form.url)
    case 'text':
      return form.text.trim() ? { ok: true, text: form.text } : EMPTY
    case 'wifi':
      return wifiPayload(form)
    case 'phone':
      return phonePayload(form.phone)
    case 'email':
      return emailPayload(form)
    case 'vcard':
      return vcardPayload(form)
  }
}
