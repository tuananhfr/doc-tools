import { translate } from '@/i18n/runtime'

function removeVietnameseMarks(input: string): string {
  return input.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFC')
}

export interface VietQrInput {
  bin: string
  account: string
  amount: string
  note: string
}

function tlv(id: string, value: string): string {
  if (value.length > 99) throw new Error(translate('qr:vietqr.fieldTooLong'))
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

export function crc16Ccitt(value: string): string {
  let crc = 0xffff
  for (const char of value) {
    crc ^= char.charCodeAt(0) << 8
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000 ? crc << 1 ^ 0x1021 : crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function buildVietQr(input: VietQrInput): string | null {
  const bin = input.bin.trim()
  const account = input.account.trim()
  const amount = input.amount.trim()
  if (!/^\d{6}$/.test(bin) || !/^\d{4,30}$/.test(account) || (amount && !/^[1-9]\d{0,11}$/.test(amount))) return null
  const note = removeVietnameseMarks(input.note).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50)
  try {
    const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account)) + tlv('02', 'QRIBFTTA')
    let payload = tlv('00', '01') + tlv('01', amount ? '12' : '11') + tlv('38', merchant) + tlv('53', '704')
    if (amount) payload += tlv('54', amount)
    payload += tlv('58', 'VN')
    if (note) payload += tlv('62', tlv('08', note))
    payload += '6304'
    return payload + crc16Ccitt(payload)
  } catch {
    return null
  }
}
