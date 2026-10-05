/** Loại nội dung của mã QR — quyết định ô nhập và chuỗi được mã hoá. */
export type QrKind = 'url' | 'text' | 'wifi' | 'phone' | 'email' | 'vcard'

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass'

/** Mọi ô nhập của màn tạo mã; đổi loại không xoá thứ đã gõ ở loại khác. */
export interface QrForm {
  kind: QrKind
  url: string
  text: string
  ssid: string
  password: string
  security: WifiSecurity
  hidden: boolean
  phone: string
  email: string
  subject: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactOrg: string
  contactTitle: string
}

/** `reason: null` = chưa nhập gì, không phải lỗi. */
export type QrPayload = { ok: true; text: string } | { ok: false; reason: string | null }

/** Lưới ô của một mã QR, chưa kể vùng trắng bao quanh. */
export interface QrMatrix {
  size: number
  dark: (column: number, row: number) => boolean
}

export interface QrColor {
  id: string
  label: string
  value: string
}

/** Một mã đã đọc được (từ ảnh hoặc camera). */
export interface ScanHit {
  id: string
  text: string
  /** Tên loại mã theo zxing: "QR_CODE", "EAN_13"… */
  format: string
  /** `Date.now()` lúc đọc được. */
  at: number
}

/** Ý nghĩa của chuỗi đọc được — để biết nên mời làm gì với nó. */
export type ScanContent =
  | { kind: 'url'; href: string; host: string }
  | { kind: 'wifi'; ssid: string; password: string; security: string }
  | { kind: 'phone'; number: string }
  | { kind: 'email'; address: string }
  | { kind: 'text' }
