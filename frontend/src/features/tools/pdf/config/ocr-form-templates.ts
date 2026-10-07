import type { OcrFieldKind } from '../types/ocr-layout.types'

export const OCR_FORM_TEMPLATES = [{ id: 'receipt-vi', version: '1.0.0', fields: [
  { id: 'name', label: 'Người nhận', anchors: ['nguoi nhan'], kind: 'text' as OcrFieldKind, required: true },
  { id: 'amount', label: 'Số tiền', anchors: ['so tien', 'so tien dong'], kind: 'money' as OcrFieldKind, required: true },
  { id: 'date', label: 'Ngày', anchors: ['ngay'], kind: 'date' as OcrFieldKind, required: true },
] }] as const
