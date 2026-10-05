import { degrees, type PDFDocument } from 'pdf-lib'
import type { StampMeta } from '../types/decorations.types'
import type { PageRef } from '../types/doc-tools.types'
import {
  DOCUMENT_COLORS,
  layoutHeaderFooter,
  layoutWatermark,
  stampContext,
  stampRects,
  type ResolvedDecorations,
} from '../utils/decorations'
import { normalizeRotation, visualSize, visualToUser } from '../utils/page-geometry'
import { drawTextRun as drawRun } from './pdf-draw'
import type { FontLoader } from './pdf-fonts'

/**
 * Vẽ đầu/chân trang + watermark + dấu ảnh lên tài liệu vừa dựng. `refs[i]` là trang thứ
 * i của `doc`. `{n}` / `{N}` đếm trong CHÍNH tệp này — tách ra nhiều tệp thì
 * tệp nào cũng bắt đầu lại từ số bắt đầu.
 */
export async function decorateDocument(
  doc: PDFDocument,
  refs: PageRef[],
  decorations: ResolvedDecorations,
  meta: StampMeta,
  fonts: FontLoader,
): Promise<void> {
  const { headerFooter, watermark, imageStamp } = decorations
  const inFile = refs.map((ref) => ({
    header: !!headerFooter?.pageIds.has(ref.id),
    watermark: !!watermark?.pageIds.has(ref.id),
    image: !!imageStamp?.pageIds.has(ref.id),
  }))
  const regular = inFile.some((page) => page.header) ? await fonts('regular') : null
  const bold = inFile.some((page) => page.watermark) ? await fonts('bold') : null
  // Nhúng MỘT lần, mọi trang trỏ chung một XObject — dấu trên 300 trang không làm tệp phình 300 lần.
  const stamp =
    imageStamp && inFile.some((page) => page.image)
      ? imageStamp.value.mime === 'image/png'
        ? await doc.embedPng(imageStamp.value.bytes)
        : await doc.embedJpg(imageStamp.value.bytes)
      : null
  if (!regular && !bold && !stamp) return

  const pages = doc.getPages()

  pages.forEach((page, index) => {
    const box = page.getCropBox()
    const rotation = normalizeRotation(page.getRotation().angle)
    const size = visualSize(box, rotation)

    if (watermark && inFile[index].watermark && bold) {
      const placement = layoutWatermark(watermark.value, size)
      drawRun(page, box, rotation, {
        text: placement.text,
        font: bold,
        size: placement.size,
        anchor: placement.center,
        align: 'middle',
        angle: placement.angle,
        baselineShift: placement.baselineShift,
        color: DOCUMENT_COLORS[watermark.value.color],
        opacity: watermark.value.opacity,
      })
    }

    if (imageStamp && inFile[index].image && stamp) {
      for (const rect of stampRects(imageStamp.value, size, refs[index].id)) {
        // pdf-lib đặt ảnh theo góc DƯỚI-trái rồi xoay quanh điểm đó — cùng cách neo với một dòng chữ.
        const origin = visualToUser({ x: rect.x, y: rect.y + rect.height }, box, rotation)
        page.drawImage(stamp, { x: origin.x, y: origin.y, width: rect.width, height: rect.height, rotate: degrees(rotation), opacity: imageStamp.value.opacity })
      }
    }

    if (headerFooter && inFile[index].header && regular) {
      const context = stampContext(index, pages.length, headerFooter.value.startNumber, meta.date, meta.fileName)
      for (const placement of layoutHeaderFooter(headerFooter.value, size, context)) {
        drawRun(page, box, rotation, {
          text: placement.text,
          font: regular,
          size: placement.size,
          anchor: placement.anchor,
          align: placement.align,
          angle: 0,
          baselineShift: 0,
          color: DOCUMENT_COLORS.text,
          opacity: 1,
        })
      }
    }
  })
}
