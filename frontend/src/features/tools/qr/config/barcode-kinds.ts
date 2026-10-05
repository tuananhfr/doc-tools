import type { BarcodeKind } from '../types/barcode.types'

export interface BarcodeKindSpec {
  kind: BarcodeKind
  label: string
  /** Mã loại của bwip-js. */
  bcid: string
  /** Một dòng: dùng khi nào. */
  hint: string
  placeholder: string
  /** Mã chuẩn GS1 — số phải do GS1 cấp, công cụ không được bịa. */
  gs1: boolean
}

export const BARCODE_KINDS: BarcodeKindSpec[] = [
  { kind: 'code128', label: 'Code 128', bcid: 'code128', hint: 'Mã nội bộ: vật tư, tài sản, kho — chữ, số, ký hiệu', placeholder: 'VT-000123', gs1: false },
  { kind: 'code39', label: 'Code 39', bcid: 'code39', hint: 'Mã nội bộ cho máy quét đời cũ — chữ hoa, số, - . $ / + %', placeholder: 'TS-0042', gs1: false },
  { kind: 'ean13', label: 'EAN-13', bcid: 'ean13', hint: 'Mã sản phẩm bán lẻ, 13 số do GS1 cấp', placeholder: '12 số, số kiểm tra tự thêm', gs1: true },
  { kind: 'ean8', label: 'EAN-8', bcid: 'ean8', hint: 'Mã sản phẩm cỡ nhỏ, 8 số do GS1 cấp', placeholder: '7 số, số kiểm tra tự thêm', gs1: true },
  { kind: 'itf14', label: 'ITF-14', bcid: 'itf14', hint: 'Mã thùng / kiện hàng, 14 số theo GS1', placeholder: '13 số, số kiểm tra tự thêm', gs1: true },
]

export function barcodeKind(kind: BarcodeKind): BarcodeKindSpec {
  return BARCODE_KINDS.find((spec) => spec.kind === kind) ?? BARCODE_KINDS[0]
}

/** Trần một lô — cùng trần với nhãn in hàng loạt (spec QR Trace v2.0). */
export const BARCODE_BATCH_LIMIT = 500
