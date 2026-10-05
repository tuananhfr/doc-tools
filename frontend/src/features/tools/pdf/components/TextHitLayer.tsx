import type { SearchHit } from '../hooks/useTextSearch'
import { visualSize, type QuarterTurn, type Size } from '../utils/page-geometry'
import { BaseFrame } from './MarkupShapes'

interface TextHitLayerProps {
  hits: SearchHit[]
  activeId: string | null
  /** Khổ trang nhìn thấy (pt), đã áp mọi xoay. */
  size: Size
  rotation: QuarterTurn
}

/** Tô chỗ khớp kết quả tìm — chỉ trên màn hình, không bao giờ vào tệp xuất. */
export function TextHitLayer({ hits, activeId, size, rotation }: TextHitLayerProps) {
  if (hits.length === 0) return null
  return (
    <svg className="erp-doc-hits" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden>
      <BaseFrame base={visualSize(size, rotation)} rotation={rotation}>
        {hits.map((hit) =>
          hit.quads.map((quad, index) => (
            <polygon
              key={`${hit.id}:${index}`}
              className={hit.id === activeId ? 'is-active' : undefined}
              points={quad.map((point) => `${point.x},${point.y}`).join(' ')}
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
      </BaseFrame>
    </svg>
  )
}
