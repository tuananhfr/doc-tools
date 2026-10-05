import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { parseDecimal, ToolPanel } from '@/features/tools/hub'
import { TARGET_SPECS, targetSpec } from '../config/targets'
import type { TargetType } from '../types/orientation.types'
import { axisAngle, formatDeg } from '../utils/azimuth'
import type { OrientationAction, OrientationState } from '../utils/orientation-state'
import { measurements, targetLabel } from '../utils/orientation-summary'

interface TargetsPanelProps {
  state: OrientationState
  hasImage: boolean
  disabled: boolean
  dispatch: (action: OrientationAction) => void
}

/** Các đối tượng đang đo (spec v1.1 §10): mỗi cái một trục, chung một mốc Bắc. */
export function TargetsPanel({ state, hasImage, disabled, dispatch }: TargetsPanelProps) {
  const used = new Set(state.targets.map((target) => target.type))
  const addable = TARGET_SPECS.filter((spec) => spec.type === 'CUSTOM' || !used.has(spec.type))
  const [adding, setAdding] = useState<TargetType>(addable[0]?.type ?? 'CUSTOM')
  const next = addable.some((spec) => spec.type === adding) ? adding : (addable[0]?.type ?? 'CUSTOM')
  const active = state.targets.find((target) => target.id === state.activeId)
  const pro = state.mode === 'PROFESSIONAL'

  return (
    <ToolPanel title="Đo hướng của">
      <ul className="erp-orient-targets">
        {measurements(state).map(({ target, azimuth, direction }) => {
          const spec = targetSpec(target.type)
          const selected = target.id === state.activeId
          return (
            <li key={target.id} className={`erp-orient-target${selected ? ' is-active' : ''}`}>
              <button
                type="button"
                className="erp-orient-target__pick"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => dispatch({ type: 'activate', id: target.id })}
              >
                <Icon name={spec.icon} className="erp-orient-target__icon" />
                <span className="erp-orient-target__text">
                  <span className="erp-orient-target__name">{targetLabel(target)}</span>
                  <span className="erp-orient-target__value">
                    {azimuth === null ? (hasImage && !target.axis ? 'Chưa đặt trục' : 'Chưa có số đo') : `${formatDeg(azimuth)} · ${direction?.name}`}
                  </span>
                </span>
              </button>
              {state.targets.length > 1 ? (
                <button
                  type="button"
                  className="btn erp-orient-target__remove"
                  aria-label={`Bỏ ${targetLabel(target)}`}
                  disabled={disabled}
                  onClick={() => dispatch({ type: 'remove-target', id: target.id })}
                >
                  <Icon name="x-lg" />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>

      {active ? <p className="erp-orient-target-hint">{targetSpec(active.type).hint}.</p> : null}

      {active?.type === 'CUSTOM' ? (
        <Form.Group controlId="orient-custom" className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Tên đối tượng</Form.Label>
          <Form.Control
            value={active.label ?? ''}
            maxLength={40}
            placeholder="Ví dụ: Cổng phụ"
            disabled={disabled}
            onChange={(event) => dispatch({ type: 'rename-target', id: active.id, label: event.target.value })}
          />
        </Form.Group>
      ) : null}

      {pro && active?.axis ? <AxisAngleField key={active.id} angle={axisAngle(active.axis) ?? 0} disabled={disabled} onChange={(deg) => dispatch({ type: 'turn-axis', id: active.id, deg })} /> : null}

      <div className="erp-orient-add">
        <Form.Select aria-label="Đối tượng muốn thêm" value={next} disabled={disabled} onChange={(event) => setAdding(event.target.value as TargetType)}>
          {addable.map((spec) => (
            <option key={spec.type} value={spec.type}>
              {spec.label}
            </option>
          ))}
        </Form.Select>
        <Button variant="outline-secondary" disabled={disabled} onClick={() => dispatch({ type: 'add-target', target: next })}>
          <Icon name="plus-lg" className="me-2" />
          Thêm
        </Button>
      </div>
    </ToolPanel>
  )
}

interface AxisAngleFieldProps {
  angle: number
  disabled: boolean
  onChange: (deg: number) => void
}

/** Chuyên môn: xoay trục bằng số thay vì kéo tay — góc trên ẢNH, không phải số độ so với Bắc. */
function AxisAngleField({ angle, disabled, onChange }: AxisAngleFieldProps) {
  const [text, setText] = useState(String(Math.round(angle * 10) / 10).replace('.', ','))
  return (
    <Form.Group controlId="orient-axis-angle" className="erp-flow-field">
      <Form.Label className="erp-flow-field__label">Góc trục trên ảnh</Form.Label>
      <div className="erp-orient-degree">
        <Form.Control
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value)
            const value = parseDecimal(event.target.value)
            if (value !== null) onChange(value)
          }}
        />
        <span className="erp-orient-degree__unit" aria-hidden="true">
          °
        </span>
      </div>
      <Form.Text className="erp-flow-field__hint">0° = chĩa lên mép trên ảnh, theo chiều kim đồng hồ.</Form.Text>
    </Form.Group>
  )
}
