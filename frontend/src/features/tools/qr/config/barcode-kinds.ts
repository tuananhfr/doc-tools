import type { BarcodeKind } from '../types/barcode.types'

export interface BarcodeKindSpec {
  kind: BarcodeKind
  label: string
  /** Mã loại của bwip-js. Gợi ý + ví dụ nhập nằm ở `qr:barcodeKinds.<kind>`. */
  bcid: string
  /** Mã chuẩn GS1 — số phải do GS1 cấp, công cụ không được bịa. */
  gs1: boolean
}

export const BARCODE_KINDS: BarcodeKindSpec[] = [
  { kind: 'code128', label: 'Code 128', bcid: 'code128', gs1: false },
  { kind: 'code39', label: 'Code 39', bcid: 'code39', gs1: false },
  { kind: 'ean13', label: 'EAN-13', bcid: 'ean13', gs1: true },
  { kind: 'ean8', label: 'EAN-8', bcid: 'ean8', gs1: true },
  { kind: 'itf14', label: 'ITF-14', bcid: 'itf14', gs1: true },
]

export function barcodeKind(kind: BarcodeKind): BarcodeKindSpec {
  return BARCODE_KINDS.find((spec) => spec.kind === kind) ?? BARCODE_KINDS[0]
}

/** Trần một lô — cùng trần với nhãn in hàng loạt (spec QR Trace v2.0). */
export const BARCODE_BATCH_LIMIT = 500
