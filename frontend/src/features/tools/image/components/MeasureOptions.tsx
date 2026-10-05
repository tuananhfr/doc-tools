import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { LengthUnit, MeasureReference, MeasureScale, MeasureState } from '../types/measure.types'
import { distance, formatArea, formatLength, polygonArea, polygonPerimeter, summarize } from '../utils/measure'
import type { MeasureAction } from '../utils/measure-state'

interface MeasureOptionsProps {
  state: MeasureState
  scale: MeasureScale | null
  dispatch: (action: MeasureAction) => void
}

const UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
]

const decimal = (value: number) => String(value).replace('.', ',')

/**
 * Ô nhập chiều dài thật. Giữ CHỮ người dùng đang gõ ở đây chứ không dựng lại từ
 * con số: "2," chưa là số, dựng lại từ số là xoá mất dấu phẩy vừa gõ.
 */
function ReferenceLength({ reference, dispatch }: { reference: MeasureReference; dispatch: (action: MeasureAction) => void }) {
  const ids = useId()
  const [text, setText] = useState(() => (reference.length ? decimal(reference.length) : ''))

  return (
    <div className="erp-flow-field">
      <label className="erp-flow-field__label" htmlFor={`${ids}-length`}>
        Chiều dài thật của đoạn chuẩn
      </label>
      <div className="erp-measure-length">
        <Form.Control
          id={`${ids}-length`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ví dụ 2,1"
          // Vừa đặt xong đoạn chuẩn thì việc kế tiếp luôn là nhập chiều dài.
          autoFocus={reference.length === null}
          value={text}
          isInvalid={text.trim() !== '' && reference.length === null}
          onChange={(event) => {
            setText(event.target.value)
            const value = Number(event.target.value.trim().replace(',', '.'))
            dispatch({ type: 'reference-length', length: Number.isFinite(value) && value > 0 ? value : null, unit: reference.unit })
          }}
        />
        <Form.Select
          aria-label="Đơn vị"
          value={reference.unit}
          onChange={(event) => dispatch({ type: 'reference-length', length: reference.length, unit: event.target.value as LengthUnit })}
        >
          {UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </Form.Select>
      </div>
      <Button variant="link" size="sm" className="erp-image-reset" onClick={() => dispatch({ type: 'clear-reference' })}>
        Bỏ đoạn chuẩn
      </Button>
    </div>
  )
}

/** Cột phải của "Đo kích thước ảnh": đoạn chuẩn (quy điểm ảnh ra đơn vị thật) và danh sách số đo. */
export function MeasureOptions({ state, scale, dispatch }: MeasureOptionsProps) {
  const { reference, shapes } = state
  const placing = state.mode === 'reference'
  const { counts } = summarize(shapes)
  const distances = shapes.filter((shape) => shape.kind === 'distance')
  const areas = shapes.filter((shape) => shape.kind === 'area')

  return (
    <>
      <div className="erp-flow-field">
        <span className="erp-flow-field__label">Đoạn chuẩn</span>
        <p className="erp-flow-field__hint">Đánh dấu một vật đã biết chiều dài để quy số đo ra đơn vị thật.</p>
        <Button variant={placing ? 'secondary' : 'outline-secondary'} aria-pressed={placing} onClick={() => dispatch({ type: 'mode', mode: placing ? 'distance' : 'reference' })}>
          <Icon name="bullseye" className="me-2" />
          {placing ? 'Đang đặt — bấm hai điểm trên ảnh' : reference ? 'Đặt lại đoạn chuẩn' : 'Đặt đoạn chuẩn'}
        </Button>
      </div>

      {reference ? <ReferenceLength reference={reference} dispatch={dispatch} /> : null}

      {scale ? (
        <p className="erp-flow-field__hint">Số đo chỉ đúng với những thứ nằm cùng mặt phẳng với đoạn chuẩn, trên ảnh chụp thẳng góc.</p>
      ) : (
        <p className="erp-measure-warning">
          <Icon name="exclamation-triangle" />
          <span>{reference ? 'Chưa nhập chiều dài thật' : 'Chưa có đoạn chuẩn'} — số đo đang tính bằng điểm ảnh (px).</span>
        </p>
      )}

      <div className="erp-flow-field">
        <span className="erp-flow-field__label">Số đo</span>
        {shapes.length === 0 ? (
          <p className="erp-flow-field__hint">Chưa có số đo nào.</p>
        ) : (
          <ul className="erp-measure-results">
            {distances.map((shape, index) => (
              <li key={shape.id} className="erp-measure-result">
                <span className="erp-measure-result__name">Đoạn {index + 1}</span>
                <span className="erp-measure-result__value">{formatLength(distance(shape.points[0], shape.points[1]), scale)}</span>
                <button type="button" className="btn erp-flow-file__button" aria-label={`Xoá đoạn ${index + 1}`} title="Xoá" onClick={() => dispatch({ type: 'remove', id: shape.id })}>
                  <Icon name="x-lg" />
                </button>
              </li>
            ))}
            {areas.map((shape, index) => (
              <li key={shape.id} className="erp-measure-result">
                <span className="erp-measure-result__name">Vùng {index + 1}</span>
                <span className="erp-measure-result__value">
                  {formatArea(polygonArea(shape.points), scale)}
                  <span className="erp-measure-result__extra">chu vi {formatLength(polygonPerimeter(shape.points), scale)}</span>
                </span>
                <button type="button" className="btn erp-flow-file__button" aria-label={`Xoá vùng ${index + 1}`} title="Xoá" onClick={() => dispatch({ type: 'remove', id: shape.id })}>
                  <Icon name="x-lg" />
                </button>
              </li>
            ))}
            {counts > 0 ? (
              <li className="erp-measure-result erp-measure-result--count">
                <span className="erp-measure-result__name">Đã đếm</span>
                <span className="erp-measure-result__value">{counts}</span>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </>
  )
}
