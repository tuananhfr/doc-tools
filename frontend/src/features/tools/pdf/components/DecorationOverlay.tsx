import type { StampMeta } from '../types/decorations.types'
import {
  DOCUMENT_COLORS,
  layoutHeaderFooter,
  layoutWatermark,
  rgbCss,
  stampContext,
  type ResolvedDecorations,
} from '../utils/decorations'
import type { Size } from '../utils/page-geometry'

/** Những gì lớp phủ cần để vẽ giống hệt lúc xuất — tính một lần ở trang, truyền xuống từng thẻ. */
export interface StampView {
  decorations: ResolvedDecorations
  meta: StampMeta
  /** Tổng số trang trên lưới — xem trước đánh số như khi xuất CẢ tài liệu thành một tệp. */
  total: number
}

interface DecorationOverlayProps {
  /** Khổ trang nhìn thấy (pt), đã áp mọi xoay. */
  size: Size
  pageId: string
  index: number
  view: StampView
}

const TEXT_COLOR = rgbCss(DOCUMENT_COLORS.text)

/**
 * Số trang / đầu-chân trang / watermark vẽ bằng SVG đè lên ảnh trang, dùng
 * CHUNG hàm bố cục với `pdf-decorate` và cùng phông (khai `@font-face` trong
 * doc-tools.css) — lệch một bên là màn hình và tệp xuất khác nhau.
 */
export function DecorationOverlay({ size, pageId, index, view }: DecorationOverlayProps) {
  const { headerFooter, watermark } = view.decorations
  const showWatermark = !!watermark?.pageIds.has(pageId)
  const showHeader = !!headerFooter?.pageIds.has(pageId)
  if (!showWatermark && !showHeader) return null

  const mark = watermark && showWatermark ? layoutWatermark(watermark.value, size) : null
  const stamps =
    headerFooter && showHeader
      ? layoutHeaderFooter(
          headerFooter.value,
          size,
          stampContext(index, view.total, headerFooter.value.startNumber, view.meta.date, view.meta.fileName),
        )
      : []

  return (
    <svg className="erp-doc-stamp" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden>
      {mark && watermark ? (
        <text
          x={mark.center.x}
          y={mark.center.y + mark.baselineShift}
          textAnchor="middle"
          fontSize={mark.size}
          fontWeight={700}
          fill={rgbCss(DOCUMENT_COLORS[watermark.value.color])}
          fillOpacity={watermark.value.opacity}
          transform={`rotate(${-mark.angle} ${mark.center.x} ${mark.center.y})`}
        >
          {mark.text}
        </text>
      ) : null}
      {stamps.map((stamp) => (
        <text key={stamp.slot} x={stamp.anchor.x} y={stamp.anchor.y} textAnchor={stamp.align} fontSize={stamp.size} fill={TEXT_COLOR}>
          {stamp.text}
        </text>
      ))}
    </svg>
  )
}
