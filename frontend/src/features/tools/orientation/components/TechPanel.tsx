import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { downloadOutput, ToolPanel } from '@/features/tools/hub'
import type { NorthReference } from '../types/orientation.types'
import type { OrientationSourceFile } from '../types/source.types'
import { hasResult } from '../utils/compass-view'
import { orientationRecord } from '../utils/orientation-record'
import type { OrientationAction, OrientationState } from '../utils/orientation-state'
import { NORTH_LABEL } from '../utils/orientation-summary'

interface TechPanelProps {
  state: OrientationState
  source: OrientationSourceFile | null
  disabled: boolean
  dispatch: (action: OrientationAction) => void
  checkpoint: () => void
}

const REFERENCES: NorthReference[] = ['TRUE', 'MAGNETIC', 'PROJECT']

/** Tuỳ chọn chuyên môn (spec v1.1 §6): loại Bắc, 8/16 cung, cỡ la bàn, bản ghi số đo. */
export function TechPanel({ state, source, disabled, dispatch, checkpoint }: TechPanelProps) {
  const compass = state.compass
  // Kéo thanh trượt là một bước hoàn tác, không phải mỗi nấc một bước.
  const slide = { onPointerDown: checkpoint, onKeyDown: checkpoint }

  const saveRecord = () => {
    const record = orientationRecord(state, source, new Date())
    downloadOutput({ name: 'so-do-huong-nha.json', blob: new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }) })
  }

  return (
    <ToolPanel title="Thông số kỹ thuật">
      <Form.Group controlId="orient-reference" className="erp-flow-field">
        <Form.Label className="erp-flow-field__label">Số độ tính theo</Form.Label>
        <Form.Select
          value={state.northReference}
          disabled={disabled}
          onChange={(event) => dispatch({ type: 'north-reference', reference: event.target.value as NorthReference })}
        >
          {REFERENCES.map((reference) => (
            <option key={reference} value={reference}>
              {NORTH_LABEL[reference]}
            </option>
          ))}
        </Form.Select>
        <Form.Text className="erp-flow-field__hint">
          Chỉ ghi nhãn, không tự quy đổi. Ở Việt Nam Bắc từ lệch Bắc thật dưới 1°; Bắc dự án theo lưới toạ độ của bản vẽ.
        </Form.Text>
      </Form.Group>

      <div className="erp-flow-field">
        <span className="erp-flow-field__label">Chia la bàn</span>
        <div className="erp-tool-tabs" role="group" aria-label="Số cung của la bàn">
          {([8, 16] as const).map((divisions) => (
            <button
              key={divisions}
              type="button"
              className={`btn erp-tool-tab${state.divisions === divisions ? ' is-active' : ''}`}
              aria-pressed={state.divisions === divisions}
              disabled={disabled}
              onClick={() => dispatch({ type: 'divisions', divisions })}
            >
              {divisions} hướng
            </button>
          ))}
        </div>
      </div>

      {compass ? (
        <>
          <Form.Group controlId="orient-size" className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">Cỡ la bàn trên ảnh · {Math.round(compass.radius * 200)}%</Form.Label>
            <Form.Range
              min={8}
              max={50}
              value={Math.round(compass.radius * 100)}
              disabled={disabled}
              {...slide}
              onChange={(event) => dispatch({ type: 'compass', patch: { radius: Number(event.target.value) / 100 }, transient: true })}
            />
          </Form.Group>
          <Form.Group controlId="orient-opacity" className="erp-flow-field">
            <Form.Label className="erp-flow-field__label">Độ đậm la bàn · {Math.round(compass.opacity * 100)}%</Form.Label>
            <Form.Range
              min={30}
              max={100}
              value={Math.round(compass.opacity * 100)}
              disabled={disabled}
              {...slide}
              onChange={(event) => dispatch({ type: 'compass', patch: { opacity: Number(event.target.value) / 100 }, transient: true })}
            />
          </Form.Group>
        </>
      ) : null}

      <Button variant="outline-secondary" className="align-self-start" disabled={disabled || !hasResult(state)} onClick={saveRecord}>
        <Icon name="filetype-json" className="me-2" />
        Tải bản ghi số đo (JSON)
      </Button>
    </ToolPanel>
  )
}
