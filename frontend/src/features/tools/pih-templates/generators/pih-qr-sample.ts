import type { QrForm } from '@/features/tools/qr/types/qr.types'

/**
 * QR: "Truy xuất Foodtek / Sổ Nhà" — nội dung demo cho mã QR minh hoạ. Dùng loại `text`
 * (không phải `url`) để không cần một địa chỉ thật nào có thể quét lỗi: nội dung chỉ là
 * chữ mô tả, rõ ràng là dữ liệu giả lập ngay trong chuỗi được mã hoá.
 */
export const PIH_QR_SAMPLE_PATCH: Partial<QrForm> = {
  kind: 'text',
  text: 'FOODTEK DEMO - Lô hàng: FT-DEMO-0001 (dữ liệu minh hoạ, không phải mã tra cứu thật)',
}
