import {
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  TextRenderingMode,
  type PDFOperator,
  type PDFPage,
} from 'pdf-lib'
import type { TextRun } from '../types/text-layer.types'
import { normalizeRotation, visualToUser, type Point } from '../utils/page-geometry'
import type { FontLoader } from './pdf-fonts'

/**
 * Lớp chữ ẩn (render mode 3) từ kết quả OCR — tệp xuất tìm, chọn, chép chữ
 * được ở mọi trình đọc mà hình trang không đổi. Mỗi từ được kéo giãn ngang
 * cho khớp đúng bề rộng chữ trên ảnh: không thì bôi chọn lệch khỏi chữ thấy.
 * Gọi TRƯỚC khi áp xoay thêm, như `drawMarkups`.
 */
export async function drawOcrText(page: PDFPage, runs: TextRun[], fonts: FontLoader): Promise<void> {
  if (runs.length === 0) return
  const font = await fonts('regular')
  const key = page.node.newFontDictionary(font.name, font.ref)
  const box = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)
  const toUser = (point: Point) => visualToUser(point, box, rotation)

  const operators: PDFOperator[] = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)]
  for (const run of runs) {
    const natural = font.widthOfTextAtSize(run.text, run.size)
    if (natural <= 0 || run.size <= 0) continue
    const radians = (run.angle * Math.PI) / 180
    // Khung gốc y hướng xuống: dọc chữ là (cos, −sin), phía trên chữ là (−sin, −cos).
    const origin = toUser(run.origin)
    const along = toUser({ x: run.origin.x + Math.cos(radians), y: run.origin.y - Math.sin(radians) })
    const up = toUser({ x: run.origin.x - Math.sin(radians), y: run.origin.y - Math.cos(radians) })
    const stretch = run.width / natural
    operators.push(
      setFontAndSize(key, run.size),
      setTextMatrix(
        (along.x - origin.x) * stretch,
        (along.y - origin.y) * stretch,
        up.x - origin.x,
        up.y - origin.y,
        origin.x,
        origin.y,
      ),
      // Dấu cách cuối từ để chép ra vẫn tách từ ở trình đọc không tự đoán khoảng trắng.
      showText(font.encodeText(run.eol ? run.text : `${run.text} `)),
    )
  }
  operators.push(endText(), popGraphicsState())
  page.pushOperators(...operators)
}
