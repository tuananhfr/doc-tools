export interface SvgPath {
  d: string
  /** Nét vạch (bwip-js vẽ mỗi vạch là một đường có độ dày); null = hình tô (chữ). */
  strokeWidth: number | null
}

export interface ParsedSvg {
  width: number
  height: number
  paths: SvgPath[]
}

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null

/**
 * Đọc SVG của bwip-js (chỉ có `<path>`, không lồng nhóm, không transform) để vẽ
 * lại thành nét VECTOR trong PDF. Không phải bộ đọc SVG tổng quát.
 */
export function parseBarcodeSvg(svg: string): ParsedSvg | null {
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  if (!box) return null
  const paths: SvgPath[] = []
  for (const [tag] of svg.matchAll(/<path\b[^>]*>/g)) {
    const d = attr(tag, 'd')
    if (!d) continue
    const stroke = attr(tag, 'stroke-width')
    paths.push({ d, strokeWidth: stroke === null ? null : Number(stroke) })
  }
  return { width: Number(box[1]), height: Number(box[2]), paths }
}
