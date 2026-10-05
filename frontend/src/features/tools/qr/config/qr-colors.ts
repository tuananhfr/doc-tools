import { primitive, scale } from '@/styles/tokens'
import type { QrColor } from '../types/qr.types'

/**
 * Nền mã LUÔN trắng, kể cả ở theme tối: mã sáng trên nền tối (đảo màu) thì nhiều
 * máy quét không đọc, mà tệp tải về còn được in ra giấy trắng.
 */
export const QR_BACKGROUND = scale.ice[0]

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
