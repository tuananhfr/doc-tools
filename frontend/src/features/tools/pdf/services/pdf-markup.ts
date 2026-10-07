import type { PDFPage } from 'pdf-lib'
import type { Markup } from '../types/markup.types'
import { markupPrimitives } from '../utils/markup-geometry'
import { normalizeRotation } from '../utils/page-geometry'
import { drawPathPrim, drawTextRun } from './pdf-draw'
import type { FontLoader } from './pdf-fonts'
import { createTextPreparer } from './pdf-text'

/**
 * Vẽ phẳng dấu vào nội dung trang. PHẢI gọi trước khi áp xoay thêm của người
 * dùng: dấu lưu theo khung gốc (chỉ có `/Rotate` của tệp nguồn), lúc đó góc
 * xoay của trang đúng bằng khung ấy.
 */
export async function drawMarkups(page: PDFPage, markups: Markup[], fonts: FontLoader): Promise<void> {
  const prepare = createTextPreparer(page.doc, fonts)
  const box = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)

  for (const prim of markups.flatMap(markupPrimitives)) {
    if (prim.type === 'path') {
      drawPathPrim(page, box, rotation, prim)
      continue
    }
    if (!prim.text.trim()) continue
    drawTextRun(page, box, rotation, {
      content: await prepare(prim.text, { bold: prim.bold, italic: prim.italic ?? false, serif: prim.serif ?? false, match: prim.match, local: prim.local }, prim.size, prim.color),
      size: prim.size,
      anchor: prim.at,
      align: prim.align,
      angle: prim.angle,
      baselineShift: 0,
      color: prim.color,
      opacity: 1,
    })
  }
}
