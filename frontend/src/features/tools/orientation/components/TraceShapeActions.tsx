import { Button } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { OrientationAction } from '../utils/orientation-state'
import type { TraceShape, TraceTag } from '../utils/trace'

interface TraceShapeActionsProps {
  shape: TraceShape | null
  disabled: boolean
  dispatch: (action: OrientationAction) => void
  onDone: () => void
}

const TAGS: { tag: TraceTag; label: string; icon: string }[] = [
  { tag: 'FRONTAGE', label: 'Đây là mặt tiền', icon: 'house-door' },
  { tag: 'ENTRANCE', label: 'Đây là cửa chính', icon: 'door-open' },
]

/**
 * Việc làm được với nét vẽ đang chọn. Chỉ ĐƯỜNG tường mới gắn nhãn được: nhãn
 * sinh ra trục vuông góc với đường đó — đa giác / khung không có "một bức tường"
 * để vuông góc.
 */
export function TraceShapeActions({ shape, disabled, dispatch, onDone }: TraceShapeActionsProps) {
  if (!shape) return null

  return (
    <div className="erp-orient-shape" role="group" aria-label="Nét vẽ đang chọn">
      {shape.kind === 'line'
        ? TAGS.map((item) => (
            <Button
              key={item.tag}
              variant={shape.tag === item.tag ? 'secondary' : 'outline-secondary'}
              size="sm"
              aria-pressed={shape.tag === item.tag}
              disabled={disabled}
              onClick={() => dispatch({ type: 'trace-tag', id: shape.id, tag: shape.tag === item.tag ? null : item.tag })}
            >
              <Icon name={item.icon} className="me-2" />
              {item.label}
            </Button>
          ))
        : null}
      {shape.kind === 'line' && shape.tag ? (
        <Button variant="outline-secondary" size="sm" disabled={disabled} onClick={() => dispatch({ type: 'trace-flip', id: shape.id })}>
          <Icon name="arrow-left-right" className="me-2" />
          Đổi phía ra ngoài
        </Button>
      ) : null}
      <Button
        variant="outline-danger"
        size="sm"
        disabled={disabled}
        onClick={() => {
          dispatch({ type: 'trace-delete', id: shape.id })
          onDone()
        }}
      >
        <Icon name="trash3" className="me-2" />
        Xoá nét này
      </Button>
    </div>
  )
}
