import {
  BlendMode,
  degrees,
  LineCapStyle,
  LineJoinStyle,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setLineJoin,
  type PDFPage,
} from 'pdf-lib'
import type { Rgb } from '../utils/decorations'
import type { PathPrim } from '../utils/markup-geometry'
import { textStart, userAngle, visualToUser, type PageBox, type Point, type QuarterTurn, type TextAlign } from '../utils/page-geometry'
import type { PreparedText } from './pdf-text'

/**
 * Vẽ lên trang pdf-lib bằng toạ độ NHÌN THẤY (gốc trên-trái, y xuống) của
 * khung có `rotation`; hai hàm tự đổi sang user space của PDF.
 */

export interface TextRun {
  content: PreparedText
  size: number
  anchor: Point
  align: TextAlign
  angle: number
  baselineShift: number
  color: Rgb
  opacity: number
}

export function drawTextRun(page: PDFPage, box: PageBox, rotation: QuarterTurn, run: TextRun) {
  const start = visualToUser(textStart(run.anchor, run.content.width, run.align, run.angle, run.baselineShift), box, rotation)
  const angle = userAngle(run.angle, rotation)
  const radians = (angle * Math.PI) / 180
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)]
  let advance = 0
  for (const piece of run.content.pieces) {
    const x = start.x + cos * advance
    const y = start.y + sin * advance
    if (piece.kind === 'glyphs') {
      page.drawText(piece.text, { x, y, size: run.size, font: piece.font, color: rgb(...run.color), opacity: run.opacity, rotate: degrees(angle) })
    } else {
      // Ảnh neo ở góc dưới-trái rồi xoay quanh đó: lùi xuống phần chân chữ (descent) theo phương vuông góc dòng.
      page.drawImage(piece.image, {
        x: x + sin * piece.descent,
        y: y - cos * piece.descent,
        width: piece.width,
        height: piece.ascent + piece.descent,
        rotate: degrees(angle),
        opacity: run.opacity,
      })
    }
    advance += piece.width
  }
}

function format(value: number): string {
  return Number(value.toFixed(3)).toString()
}

/**
 * `drawSvgPath` của pdf-lib lật trục y (hệ SVG) quanh điểm (x, y) truyền vào —
 * đổi mọi điểm sang user space trước rồi đảo dấu y, đặt gốc 0,0: nét vẽ đúng
 * chỗ ở MỌI góc `/Rotate` mà không phải tự ghép ma trận.
 */
export function drawPathPrim(page: PDFPage, box: PageBox, rotation: QuarterTurn, prim: PathPrim) {
  const point = (p: Point) => {
    const user = visualToUser(p, box, rotation)
    return `${format(user.x)} ${format(-user.y)}`
  }
  const d = prim.segs
    .map((seg) => {
      if (seg.op === 'Z') return 'Z'
      if (seg.op === 'C') return `C ${point(seg.c1)} ${point(seg.c2)} ${point(seg.p)}`
      return `${seg.op} ${point(seg.p)}`
    })
    .join(' ')

  // pdf-lib không có tuỳ chọn nối nét — mặc định "miter" làm nét bút gắt thành gai nhọn ở chỗ gấp.
  page.pushOperators(pushGraphicsState(), setLineJoin(LineJoinStyle.Round))
  page.drawSvgPath(d, {
    x: 0,
    y: 0,
    color: prim.fill ? rgb(...prim.fill) : undefined,
    opacity: prim.fill ? (prim.fillOpacity ?? 1) : undefined,
    borderColor: prim.stroke ? rgb(...prim.stroke) : undefined,
    borderWidth: prim.stroke ? prim.width : undefined,
    borderLineCap: prim.stroke ? LineCapStyle.Round : undefined,
    blendMode: prim.multiply ? BlendMode.Multiply : undefined,
  })
  page.pushOperators(popGraphicsState())
}
