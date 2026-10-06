import { primitive, scale } from '@/styles/tokens'
import type { QrColor } from '../types/qr.types'

/** White remains the default for reliable scanning of existing QR designs. */
export const QR_BACKGROUND = scale.ice[0]

export const QR_BACKGROUND_COLORS: QrColor[] = [
  { id: 'white', label: 'Trắng', value: QR_BACKGROUND },
  { id: 'mist', label: 'Xám nhạt', value: scale.ice[50] },
  { id: 'blue-soft', label: 'Xanh dương nhạt', value: '#EAF2FF' },
  { id: 'teal-soft', label: 'Xanh ngọc nhạt', value: '#E8F7F2' },
  { id: 'amber-soft', label: 'Kem', value: '#FFF3E6' },
  { id: 'rose-soft', label: 'Hồng nhạt', value: '#FCECF0' },
]

export type QrBackground = { mode: 'transparent' | 'white' | 'custom'; color: string }

export function qrBackgroundColor(background: QrBackground): string | null {
  if (background.mode === 'transparent') return null
  return background.mode === 'white' ? QR_BACKGROUND : background.color
}

export function qrContrast(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.replace('#', '').match(/.{2}/g)?.map((part) => {
      const value = parseInt(part, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }) ?? [0, 0, 0]
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/**
 * Màu của ô tối — chỉ nhận màu ĐẬM: máy quét phân biệt ô theo độ sáng, màu nhạt
 * (cam, vàng) trên nền trắng là mã quét lúc được lúc không. Màu đầu là mặc định.
 */
export const QR_COLORS: QrColor[] = [
  { id: 'ink', label: 'Đen', value: primitive.foundation.ink },
  { id: 'steel', label: 'Xám thép', value: scale.steel[600] },
  { id: 'blue', label: 'Xanh dương', value: scale.blue[500] },
  { id: 'crimson', label: 'Đỏ', value: primitive.brand.crimsonDeep },
  { id: 'teal', label: 'Xanh ngọc', value: scale.teal[600] },
  { id: 'green', label: 'Xanh lá', value: scale.green[600] },
]
