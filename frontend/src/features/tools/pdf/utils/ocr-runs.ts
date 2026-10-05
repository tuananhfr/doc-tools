import type { TextRun } from '../types/text-layer.types'
import type { Point } from './page-geometry'

/** Hình dạng tối thiểu của kết quả tesseract.js dùng ở đây — khỏi kéo kiểu của thư viện nạp lười vào test. */
export interface OcrBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  confidence: number
  bbox: OcrBox
}

export interface OcrLine {
  words: OcrWord[]
  bbox: OcrBox
  baseline: OcrBox
  rowAttributes?: { rowHeight: number; descenders: number }
}

/** Từ dưới ngưỡng tin cậy này thường là rác đọc từ hoa văn, ảnh chụp — bỏ, kẻo tìm ra chữ ma. */
export const MIN_CONFIDENCE = 30

/** Phần trên / dưới đường chân chữ theo cỡ chữ — như lớp chữ PDF khi font không khai. */
const ASCENT = 0.8
const DESCENT = 0.2

function baselineAt(line: OcrLine, x: number, size: number): number {
  const { x0, y0, x1, y1 } = line.baseline
  if (x1 === x0) return line.bbox.y1 - size * DESCENT
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

/**
 * Dòng tesseract (điểm ảnh, trên ảnh trang ĐANG NHÌN) → mảnh chữ ở khung gốc,
 * như lớp chữ PDF: tìm, bám dòng, sửa chữ dùng lại nguyên. Chụp theo hướng
 * đang nhìn vì người dùng đã xoay trang cho chữ đứng thẳng — chụp khung gốc
 * của bản scan nằm ngang thì tesseract đọc chữ nằm nghiêng, ra toàn rác.
 */
export function ocrRuns(lines: OcrLine[], pxPerPt: number, toBase: (point: Point) => Point): TextRun[] {
  const runs: TextRun[] = []
  for (const line of lines) {
    const words = line.words.filter((word) => word.text.trim() && word.confidence >= MIN_CONFIDENCE)
    const rowHeight = line.rowAttributes?.rowHeight ?? 0
    // rowHeight = chữ x + phần trên; cộng phần dưới là xấp xỉ cả khung chữ (1 em).
    const sizePx = rowHeight > 0 ? rowHeight + Math.abs(line.rowAttributes?.descenders ?? 0) : line.bbox.y1 - line.bbox.y0
    words.forEach((word, index) => {
      const start = toBase({ x: word.bbox.x0 / pxPerPt, y: baselineAt(line, word.bbox.x0, sizePx) / pxPerPt })
      const end = toBase({ x: word.bbox.x1 / pxPerPt, y: baselineAt(line, word.bbox.x1, sizePx) / pxPerPt })
      runs.push({
        text: word.text.trim().normalize('NFC'),
        origin: start,
        angle: (Math.atan2(-(end.y - start.y), end.x - start.x) * 180) / Math.PI || 0,
        size: sizePx / pxPerPt,
        width: Math.hypot(end.x - start.x, end.y - start.y),
        ascent: ASCENT,
        descent: DESCENT,
        fontName: 'ocr',
        fontFamily: 'sans-serif',
        eol: index === words.length - 1,
      })
    })
  }
  return runs
}
