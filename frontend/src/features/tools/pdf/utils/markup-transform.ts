import type { Markup, OrientedBox, Rect } from '../types/markup.types'
import { markupBounds } from './markup-geometry'
import type { Point } from './page-geometry'

/** Phép co giãn đều + dời: `p' = p × scale + (dx, dy)`. */
export interface Similarity {
  scale: number
  dx: number
  dy: number
}

/** Phép đưa vùng `from` về trùng `to` — hai vùng cùng tỉ lệ (cùng một ảnh đặt ở hai chỗ). */
export function fitTransform(from: Rect, to: Rect): Similarity {
  const scale = from.width > 0 ? to.width / from.width : 1
  return { scale, dx: to.x - from.x * scale, dy: to.y - from.y * scale }
}

function mapPoint(p: Point, t: Similarity): Point {
  return { x: p.x * t.scale + t.dx, y: p.y * t.scale + t.dy }
}

function mapRect(box: Rect, t: Similarity): Rect {
  return { ...mapPoint(box, t), width: box.width * t.scale, height: box.height * t.scale }
}

function mapFrame(frame: OrientedBox, t: Similarity, resize = true): OrientedBox {
  return {
    ...frame,
    origin: mapPoint(frame.origin, t),
    width: resize ? frame.width * t.scale : frame.width,
    height: resize ? frame.height * t.scale : frame.height,
  }
}

/**
 * Dời + co giãn một dấu theo nội dung bên dưới (ảnh đổi khổ giấy, trang bị cắt).
 * Độ dày nét giữ nguyên (thang cố định 1/2/4 pt); ghi chú giữ cỡ vì chữ ghi chú
 * cố định cỡ — co khung mà không co chữ là chữ tràn khung.
 */
export function transformMarkup(markup: Markup, t: Similarity): Markup {
  switch (markup.kind) {
    case 'pen':
      return { ...markup, points: markup.points.map((p) => mapPoint(p, t)) }
    case 'line':
    case 'arrow':
      return { ...markup, from: mapPoint(markup.from, t), to: mapPoint(markup.to, t) }
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'highlight':
    case 'redact':
      return { ...markup, box: mapRect(markup.box, t) }
    case 'underline':
    case 'strikeout':
    case 'stamp':
      return { ...markup, frame: mapFrame(markup.frame, t) }
    case 'text':
      return { ...markup, frame: mapFrame(markup.frame, t), fontSize: markup.fontSize * t.scale }
    case 'note':
      return { ...markup, frame: mapFrame(markup.frame, t, false) }
    case 'textEdit':
      return {
        ...markup,
        frame: mapFrame(markup.frame, t),
        cover: { width: markup.cover.width * t.scale, height: markup.cover.height * t.scale },
        fontSize: markup.fontSize * t.scale,
        baseline: markup.baseline * t.scale,
        inset: markup.inset * t.scale,
      }
  }
}

function distanceTo(box: Rect, p: Point): number {
  const dx = Math.max(box.x - p.x, 0, p.x - (box.x + box.width))
  const dy = Math.max(box.y - p.y, 0, p.y - (box.y + box.height))
  return Math.hypot(dx, dy)
}

/** Ô ảnh chứa tâm dấu (hoặc gần nhất) — dấu đi theo ảnh nó nằm trên. */
function slotOf(markup: Markup, slots: Rect[]): number {
  const bounds = markupBounds(markup)
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  let best = 0
  let bestDistance = Infinity
  slots.forEach((slot, index) => {
    const distance = distanceTo(slot, center)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}

/** Dời dấu khi ảnh đổi chỗ trên tờ giấy (đổi khổ, đổi lề): `from[i]` → `to[i]`. */
export function remapMarkups(markups: Markup[] | undefined, from: Rect[], to: Rect[]): Markup[] | undefined {
  if (!markups?.length || from.length === 0 || from.length !== to.length) return markups
  return markups.map((markup) => {
    const index = slotOf(markup, from)
    return transformMarkup(markup, fitTransform(from[index], to[index]))
  })
}
