import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { parseDecimal, ToolPanel, ToolSegments, type ToolSegment } from '@/features/tools/hub'
import { formatDeg } from '../utils/azimuth'
import type { OrientationAction, OrientationMethod, OrientationState } from '../utils/orientation-state'
import { DeviceCompassPanel } from './DeviceCompassPanel'

interface MethodPanelProps {
  state: OrientationState
  hasImage: boolean
  disabled: boolean
  /** Tên đối tượng mà số độ sẽ gắn vào. */
  anchorLabel: string
  dispatch: (action: OrientationAction) => void
}

/** Bước 2 (spec v1.1 §3): đo ngay / tôi biết số độ / chỉ trên ảnh. */
export function MethodPanel({ state, hasImage, disabled, anchorLabel, dispatch }: MethodPanelProps) {
  const options: ToolSegment<OrientationMethod>[] = [
    { value: 'DEVICE', label: 'Đo ngay', icon: 'phone' },
    { value: 'MANUAL', label: 'Tôi biết số độ', icon: '123' },
    ...(hasImage ? [{ value: 'DRAWING' as const, label: 'Theo bản vẽ', icon: 'map' }] : []),
  ]
  const known = state.anchor && state.anchor.source !== 'DRAWING' ? state.anchor : null

  return (
    <ToolPanel title="Lấy hướng bằng cách nào?">
      <ToolSegments label="Cách lấy hướng" value={state.method} options={options} disabled={disabled} onChange={(method) => dispatch({ type: 'method', method })} />

      {state.method === 'DEVICE' ? (
        <>
          <DeviceCompassPanel
            targetLabel={anchorLabel}
            disabled={disabled}
            onLock={(azimuth, accuracy) => dispatch({ type: 'known-azimuth', azimuth, source: 'DEVICE', accuracy })}
            onManual={() => dispatch({ type: 'method', method: 'MANUAL' })}
          />
          {known?.source === 'DEVICE' ? (
            <p className="erp-orient-note erp-orient-note--success" role="status">
              <Icon name="check-circle" />
              Đã chốt {formatDeg(known.azimuth)} cho {anchorLabel.toLowerCase()}.
            </p>
          ) : null}
        </>
      ) : null}

      {state.method === 'MANUAL' ? (
        <ManualDegree
          key={known?.targetId ?? 'none'}
          label={anchorLabel}
          value={known?.source === 'MANUAL' ? known.azimuth : null}
          disabled={disabled}
          onChange={(azimuth) => dispatch({ type: 'known-azimuth', azimuth, source: 'MANUAL' })}
        />
      ) : null}

      {state.method === 'DRAWING' ? (
        <p className="erp-orient-note">
          <Icon name="info-circle" />
          Không cần cảm biến: chỉ cần bản vẽ có ký hiệu Bắc. Đặt mũi tên Bắc trên ảnh, rồi đặt trục của đối tượng cần đo.
        </p>
      ) : null}
    </ToolPanel>
  )
}

interface ManualDegreeProps {
  label: string
  value: number | null
  disabled: boolean
  onChange: (azimuth: number | null) => void
}

function ManualDegree({ label, value, disabled, onChange }: ManualDegreeProps) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','))
  const read = (raw: string) => (raw.trim() === '' ? null : parseDecimal(raw))
  const parsed = read(text)
  const invalid = text.trim() !== '' && (parsed === null || !Number.isFinite(parsed))

  // Gõ tới đâu tính tới đó; số âm / quá 360 vẫn nhận và quy về [0, 360) — ORI-002.
  const update = (raw: string) => {
    setText(raw)
    const next = read(raw)
    if (raw.trim() === '' || (next !== null && Number.isFinite(next))) onChange(next)
  }

  return (
    <Form.Group controlId="orient-manual" className="erp-flow-field">
      <Form.Label className="erp-flow-field__label">Số độ của {label.toLowerCase()}</Form.Label>
      <div className="erp-orient-degree">
        <Form.Control
          inputMode="decimal"
          value={text}
          placeholder="Ví dụ 132"
          isInvalid={invalid}
          disabled={disabled}
          onChange={(event) => update(event.target.value)}
        />
        <span className="erp-orient-degree__unit" aria-hidden="true">
          °
        </span>
      </div>
      <Form.Text className="erp-flow-field__hint">Đo theo chiều kim đồng hồ từ Bắc: Đông 90°, Nam 180°, Tây 270°.</Form.Text>
      {invalid ? <Form.Control.Feedback type="invalid" className="d-block">Nhập một số, ví dụ 132 hoặc 132,5.</Form.Control.Feedback> : null}
    </Form.Group>
  )
}
