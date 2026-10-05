import {
  BlendMode,
  degrees,
  LineCapStyle,
  LineJoinStyle,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setLineJoin,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type { Rgb } from '../utils/decorations'
import type { PathPrim } from '../utils/markup-geometry'
import { textStart, userAngle, visualToUser, type PageBox, type Point, type QuarterTurn, type TextAlign } from '../utils/page-geometry'

/**
 * Vẽ lên trang pdf-lib bằng toạ độ NHÌN THẤY (gốc trên-trái, y xuống) của
 * khung có `rotation`; hai hàm tự đổi sang user space của PDF.
 */

export interface TextRun {
  text: string
  font: PDFFont
  size: number
  anchor: Point
  align: TextAlign
  angle: number
  baselineShift: number
  color: Rgb
  opacity: number
}

export function drawTextRun(page: PDFPage, box: PageBox, rotation: QuarterTurn, run: TextRun) {
  const width = run.font.widthOfTextAtSize(run.text, run.size)
  const start = visualToUser(textStart(run.anchor, width, run.align, run.angle, run.baselineShift), box, rotation)
  page.drawText(run.text, {
    x: start.x,
    y: start.y,
    size: run.size,
    font: run.font,
    color: rgb(...run.color),
    opacity: run.opacity,
    rotate: degrees(userAngle(run.angle, rotation)),
  })
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
