import type { ReactNode } from 'react'
import type { Markup } from '../types/markup.types'
import { rgbCss } from '../utils/decorations'
import { markupPrimitives, REDACT_FILL, type PathSeg, type Prim } from '../utils/markup-geometry'
import { cssFamily } from '../services/text-measure'
import { baseToVisualMatrix, visualSize, type QuarterTurn, type Size } from '../utils/page-geometry'

function pathData(segs: PathSeg[]): string {
  return segs
    .map((seg) => {
      if (seg.op === 'Z') return 'Z'
      if (seg.op === 'C') return `C${seg.c1.x} ${seg.c1.y} ${seg.c2.x} ${seg.c2.y} ${seg.p.x} ${seg.p.y}`
      return `${seg.op}${seg.p.x} ${seg.p.y}`
    })
    .join('')
}

const ANCHOR = { start: 'start', middle: 'middle', end: 'end' } as const

function PrimShape({ prim }: { prim: Prim }) {
  if (prim.type === 'text') {
    const font = { serif: prim.serif ?? false, bold: prim.bold, italic: prim.italic ?? false, match: prim.match, local: prim.local }
    // Chữ con dấu / ghi chú thừa hưởng phông của lớp SVG; chỉ chữ sửa lại mới chỉ định họ phông.
    const custom = font.serif || font.match || font.local
    return (
      <text
        x={prim.at.x}
        y={prim.at.y}
        textAnchor={ANCHOR[prim.align]}
        fontSize={prim.size}
        fontWeight={prim.bold && !prim.local ? 700 : 400}
        fontStyle={prim.italic && !prim.local ? 'italic' : undefined}
        fontFamily={custom ? `'${cssFamily(font)}', ${font.serif ? 'serif' : 'sans-serif'}` : undefined}
        fill={rgbCss(prim.color)}
        transform={prim.angle ? `rotate(${-prim.angle} ${prim.at.x} ${prim.at.y})` : undefined}
      >
        {prim.text}
      </text>
    )
  }
  return (
    <path
      d={pathData(prim.segs)}
      fill={prim.fill ? rgbCss(prim.fill) : 'none'}
      fillOpacity={prim.fillOpacity}
      stroke={prim.stroke ? rgbCss(prim.stroke) : undefined}
      strokeWidth={prim.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={prim.multiply ? { mixBlendMode: 'multiply' } : undefined}
    />
  )
}

export function MarkupShape({ markup }: { markup: Markup }) {
  if (markup.kind === 'redact') {
    const { x, y, width, height } = markup.box
    // Viền đỏ đứt nét: khối đen này là XOÁ THẬT, phải nhìn khác hẳn khung che chữ (nền trắng / màu nền).
    return (
      <g className="erp-doc-redact">
        <rect x={x} y={y} width={width} height={height} fill={rgbCss(REDACT_FILL)} />
        <rect className="erp-doc-redact__edge" x={x} y={y} width={width} height={height} vectorEffect="non-scaling-stroke" />
      </g>
    )
  }
  return (
    <>
      {markupPrimitives(markup).map((prim, index) => (
        <PrimShape key={index} prim={prim} />
      ))}
    </>
  )
}

/** Nhóm SVG đổi khung gốc (nơi dấu được lưu) sang khung nhìn thấy sau xoay thêm. */
export function BaseFrame({ base, rotation, children }: { base: Size; rotation: QuarterTurn; children: ReactNode }) {
  return <g transform={`matrix(${baseToVisualMatrix(base, rotation).join(' ')})`}>{children}</g>
}

interface MarkupLayerProps {
  markups: Markup[] | undefined
  /** Khổ trang nhìn thấy (pt), đã áp mọi xoay. */
  size: Size
  rotation: QuarterTurn
}

/** Dấu chỉ để xem (ảnh thu nhỏ, xem to khi không sửa) — dùng chung hình với lúc xuất. */
export function MarkupLayer({ markups, size, rotation }: MarkupLayerProps) {
  if (!markups?.length) return null
  return (
    <svg className="erp-doc-stamp" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden>
      <BaseFrame base={visualSize(size, rotation)} rotation={rotation}>
        {markups.map((markup) => (
          <MarkupShape key={markup.id} markup={markup} />
        ))}
      </BaseFrame>
    </svg>
  )
}
