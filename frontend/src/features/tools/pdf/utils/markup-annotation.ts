import type { Markup, OrientedBox, Rect } from '../types/markup.types'
import type { Rgb } from './decorations'
import { MARKUP_COLORS, orientedPoint, STAMP_PRESETS, stampLabel } from './markup-geometry'
import type { Point } from './page-geometry'

/**
 * Dấu tay → annotation PDF thật (sửa, xoá, trả lời được trong Acrobat/Foxit).
 * Hình vẽ vẫn lấy từ CHÍNH primitive của bản in phẳng làm appearance stream,
 * nên trình đọc không tự vẽ lại theo ý nó — mở ở đâu cũng thấy giống màn hình.
 */

export const MARKUP_OUTPUT = {
  flat: 'flat',
  annotations: 'annotations',
} as const

export type MarkupOutput = (typeof MARKUP_OUTPUT)[keyof typeof MARKUP_OUTPUT]

export type AnnotSubtype = 'Square' | 'Circle' | 'Line' | 'Ink' | 'Highlight' | 'Underline' | 'StrikeOut' | 'FreeText' | 'Text' | 'Stamp'

/** Hình học trong KHUNG GỐC (pt) — đổi sang user space ở tầng pdf-lib. */
export interface AnnotSpec {
  subtype: AnnotSubtype
  contents: string
  color: Rgb
  /** Độ dày viền (pt), cho trình đọc hiện đúng khi người dùng sửa annotation. */
  border?: number
  line?: { from: Point; to: Point; arrow: boolean }
  ink?: Point[][]
  /** Mỗi đoạn: trên-trái, trên-phải, dưới-trái, dưới-phải theo chiều chữ — thứ tự Acrobat đọc. */
  quads?: Point[][]
  cloudy?: boolean
  /** Tên dấu chuẩn của `Stamp`. */
  stampName?: string
}

const STAMP_NAME: Record<keyof typeof STAMP_PRESETS, string> = {
  approved: 'Approved',
  rejected: 'NotApproved',
  checked: 'Final',
  revise: 'Experimental',
  draft: 'Draft',
}

function rectQuad(box: Rect): Point[] {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x, y: box.y + box.height },
    { x: box.x + box.width, y: box.y + box.height },
  ]
}

function frameQuad(frame: OrientedBox): Point[] {
  return [orientedPoint(frame, 0, 0), orientedPoint(frame, frame.width, 0), orientedPoint(frame, 0, frame.height), orientedPoint(frame, frame.width, frame.height)]
}

/**
 * Loại annotation cho từng dấu. `null` = luôn in phẳng: sửa/che chữ là phủ
 * lên nội dung — để thành annotation thì người nhận bấm xoá là lộ chữ cũ.
 */
export function annotationSpec(markup: Markup): AnnotSpec | null {
  switch (markup.kind) {
    case 'rect':
    case 'cloud':
      return { subtype: 'Square', contents: '', color: MARKUP_COLORS[markup.color], border: markup.width, cloudy: markup.kind === 'cloud' }
    case 'ellipse':
      return { subtype: 'Circle', contents: '', color: MARKUP_COLORS[markup.color], border: markup.width }
    case 'line':
    case 'arrow':
      return {
        subtype: 'Line',
        contents: '',
        color: MARKUP_COLORS[markup.color],
        border: markup.width,
        line: { from: markup.from, to: markup.to, arrow: markup.kind === 'arrow' },
      }
    case 'pen':
      return { subtype: 'Ink', contents: '', color: MARKUP_COLORS[markup.color], border: markup.width, ink: [markup.points] }
    case 'highlight':
      return { subtype: 'Highlight', contents: '', color: MARKUP_COLORS[markup.color], quads: [rectQuad(markup.box)] }
    case 'underline':
      return { subtype: 'Underline', contents: '', color: MARKUP_COLORS[markup.color], quads: [frameQuad(markup.frame)] }
    case 'strikeout':
      return { subtype: 'StrikeOut', contents: '', color: MARKUP_COLORS[markup.color], quads: [frameQuad(markup.frame)] }
    case 'text':
      return { subtype: 'FreeText', contents: markup.text, color: MARKUP_COLORS[markup.color] }
    case 'note':
      return { subtype: 'Text', contents: markup.text, color: MARKUP_COLORS[markup.color] }
    case 'stamp':
      return {
        subtype: 'Stamp',
        contents: `${stampLabel(markup.preset)} ${markup.date}`.trim(),
        color: STAMP_PRESETS[markup.preset].color,
        stampName: STAMP_NAME[markup.preset],
      }
    case 'textEdit':
    case 'redact':
      return null
  }
}
