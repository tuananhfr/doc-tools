import { BARCODE_BATCH_LIMIT } from '../config/barcode-kinds'
import type { BarcodeKind, BarcodeRow } from '../types/barcode.types'
import { checkBarcode } from './barcode-check'

/** Ô đầu của từng dòng CSV — chỉ cột đầu được dùng; hiểu ngoặc kép, dấu `,` hoặc `;` (Excel tiếng Việt lưu `;`). */
export function csvFirstColumn(text: string): string[] {
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r\n|\n|\r/)
  return lines.map((line) => {
    if (line.startsWith('"')) {
      let value = ''
      for (let index = 1; index < line.length; index++) {
        if (line[index] === '"') {
          if (line[index + 1] === '"') {
            value += '"'
            index++
          } else break
        } else value += line[index]
      }
      return value
    }
    return line.split(/[,;\t]/)[0]
  })
}

export interface BatchRead {
  rows: BarcodeRow[]
  /** Dòng tiêu đề đã bỏ qua (null = không có). */
  header: string | null
  /** Số dòng bị cắt vì vượt trần. */
  dropped: number
}

/**
 * Kiểm cả lô. Dòng trống bị bỏ; dòng ĐẦU không hợp lệ mà các dòng sau hợp lệ thì
 * coi là tiêu đề cột ("Mã vật tư") chứ không báo lỗi.
 */
export function readBatch(kind: BarcodeKind, values: string[]): BatchRead {
  const filled = values.map((raw, index) => ({ raw: raw.trim(), line: index + 1 })).filter((item) => item.raw !== '')
  let header: string | null = null
  if (filled.length > 1 && !checkBarcode(kind, filled[0].raw).ok && checkBarcode(kind, filled[1].raw).ok) header = filled.shift()!.raw
  const kept = filled.slice(0, BARCODE_BATCH_LIMIT)
  return {
    rows: kept.map((item) => ({ line: item.line, raw: item.raw, check: checkBarcode(kind, item.raw) })),
    header,
    dropped: filled.length - kept.length,
  }
}
