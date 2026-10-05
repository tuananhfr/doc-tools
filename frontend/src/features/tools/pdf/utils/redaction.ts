import type { Markup, Rect } from '../types/markup.types'
import type { TextRun } from '../types/text-layer.types'
import { baseToVisual, visualSize, type QuarterTurn, type Size } from './page-geometry'

/**
 * Xoá thật (spec 07 — redaction): trang có khung xoá được dựng lại thành ảnh
 * nên không còn chữ, hình, form gốc nào để chép ra. Lớp chữ ẩn đi kèm ảnh
 * (để tìm được chữ) chỉ giữ mảnh nằm NGOÀI mọi khung.
 */

/** Chữ sát mép khung vẫn tính là bị xoá — khung bám dòng đo theo ascent/descent ước lượng, lệch được vài phần pt. */
const MARGIN = 1

export function redactBoxes(markups: Markup[] | undefined): Rect[] {
  return (markups ?? []).flatMap((markup) => (markup.kind === 'redact' ? [markup.box] : []))
}

export function hasRedactions(pages: { markups?: Markup[] }[]): boolean {
  return pages.some((page) => redactBoxes(page.markups).length > 0)
}

/** Khung bao một mảnh chữ (khung gốc, y hướng xuống) — kể cả mảnh chữ nghiêng. */
export function runBounds(run: TextRun): Rect {
  const radians = (run.angle * Math.PI) / 180
  const along = { x: Math.cos(radians), y: -Math.sin(radians) }
  const up = { x: -Math.sin(radians), y: -Math.cos(radians) }
  const corners = [0, run.width].flatMap((a) =>
    [-run.descent * run.size, run.ascent * run.size].map((u) => ({
      x: run.origin.x + along.x * a + up.x * u,
      y: run.origin.y + along.y * a + up.y * u,
    })),
  )
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

function overlaps(a: Rect, b: Rect, margin: number): boolean {
  return a.x < b.x + b.width + margin && b.x < a.x + a.width + margin && a.y < b.y + b.height + margin && b.y < a.y + a.height + margin
}

/**
 * Bỏ CẢ mảnh chữ chạm khung, không cắt theo ký tự: vị trí từng ký tự chỉ là
 * ước lượng, cắt hụt một ký tự là lộ đúng phần cần xoá.
 */
export function runsOutside(runs: TextRun[], boxes: Rect[]): TextRun[] {
  if (boxes.length === 0) return runs
  return runs.filter((run) => !boxes.some((box) => overlaps(runBounds(run), box, MARGIN)))
}

/** Khung xoá (khung gốc) → hình chữ nhật trên canvas đã vẽ trang ở xoay thêm `turn`. */
export function canvasRedactRects(boxes: Rect[], base: Size, turn: QuarterTurn, canvas: Size): Rect[] {
  const visual = visualSize(base, turn)
  const sx = canvas.width / visual.width
  const sy = canvas.height / visual.height
  return boxes.map((box) => {
    const a = baseToVisual({ x: box.x, y: box.y }, base, turn)
    const b = baseToVisual({ x: box.x + box.width, y: box.y + box.height }, base, turn)
    // Nới 1px mỗi phía: khử răng cưa ở mép khung để lại viền chữ mờ đọc được.
    const x = Math.floor(Math.min(a.x, b.x) * sx) - 1
    const y = Math.floor(Math.min(a.y, b.y) * sy) - 1
    return { x, y, width: Math.ceil(Math.max(a.x, b.x) * sx) + 1 - x, height: Math.ceil(Math.max(a.y, b.y) * sy) + 1 - y }
  })
}
