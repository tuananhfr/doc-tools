import { useId } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { MARK_ANCHORS, type MarkAnchor, type MarkColor, type MarkState, type TextStamp } from '../types/mark.types'
import { MARK_ANCHOR_LABEL, MARK_COLOR_LABEL } from '../utils/mark'

interface MarkOptionsProps {
  state: MarkState
  onChange: (change: (state: MarkState) => MarkState) => void
}

const COLORS = Object.keys(MARK_COLOR_LABEL) as MarkColor[]

/** Giới hạn độ dài dấu: dòng dài hơn sẽ bị thu chữ tới mức không đọc được. */
const MAX_TEXT = 80

/** Cột tuỳ chọn của "Che & đóng dấu ảnh": dòng chữ đóng dấu và các khung che đã vẽ. */
export function MarkOptions({ state, onChange }: MarkOptionsProps) {
  const ids = useId()
  const stamp = state.stamp
  const setStamp = (patch: Partial<TextStamp>) => onChange((current) => ({ ...current, stamp: { ...current.stamp, ...patch } }))
  const hasText = stamp.text.trim() !== ''

  return (
    <>
      <div className="erp-flow-field">
        <span className="erp-flow-field__label">Khung che</span>
        <p className="erp-flow-field__hint">
          {state.boxes.length > 0 ? `${state.boxes.length} khung — vùng bên dưới bị thay bằng khối đen trong tệp ra, không khôi phục được.` : 'Chưa có khung nào. Kéo trên ảnh để vẽ.'}
        </p>
        <Button variant="link" size="sm" className="erp-image-reset" disabled={state.boxes.length === 0} onClick={() => onChange((current) => ({ ...current, boxes: [] }))}>
          <Icon name="x-circle" className="me-2" />
          Bỏ mọi khung che
        </Button>
      </div>

      <div className="erp-flow-field">
        <label className="erp-flow-field__label" htmlFor={`${ids}-text`}>
          Chữ đóng dấu (không bắt buộc)
        </label>
        <Form.Control id={`${ids}-text`} type="text" autoComplete="off" maxLength={MAX_TEXT} placeholder="Ví dụ: BẢN NHÁP — KHÔNG SAO CHÉP" value={stamp.text} onChange={(event) => setStamp({ text: event.target.value })} />
      </div>

      {hasText ? (
        <>
          <Form.Check id={`${ids}-tile`} type="checkbox" label="Lặp chéo khắp ảnh" checked={stamp.tile} onChange={(event) => setStamp({ tile: event.target.checked })} />

          {stamp.tile ? null : (
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-anchor`}>
                Vị trí dấu
              </label>
              <Form.Select id={`${ids}-anchor`} value={stamp.anchor} onChange={(event) => setStamp({ anchor: event.target.value as MarkAnchor })}>
                {MARK_ANCHORS.map((anchor) => (
                  <option key={anchor} value={anchor}>
                    {MARK_ANCHOR_LABEL[anchor]}
                  </option>
                ))}
              </Form.Select>
            </div>
          )}

          <div className="erp-flow-field">
            <label className="erp-flow-field__label" htmlFor={`${ids}-color`}>
              Màu chữ
            </label>
            <Form.Select id={`${ids}-color`} value={stamp.color} onChange={(event) => setStamp({ color: event.target.value as MarkColor })}>
              {COLORS.map((color) => (
                <option key={color} value={color}>
                  {MARK_COLOR_LABEL[color]}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="erp-flow-field">
            <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-size`}>
              Cỡ chữ
              <output className="erp-image-range__value">{Math.round(stamp.sizeRatio * 100)}%</output>
            </label>
            <Form.Range id={`${ids}-size`} min={2} max={15} step={1} value={Math.round(stamp.sizeRatio * 100)} onChange={(event) => setStamp({ sizeRatio: Number(event.target.value) / 100 })} />
          </div>

          <div className="erp-flow-field">
            <label className="erp-flow-field__label erp-image-range__label" htmlFor={`${ids}-opacity`}>
              Độ đậm
              <output className="erp-image-range__value">{Math.round(stamp.opacity * 100)}%</output>
            </label>
            <Form.Range id={`${ids}-opacity`} min={10} max={100} step={5} value={Math.round(stamp.opacity * 100)} onChange={(event) => setStamp({ opacity: Number(event.target.value) / 100 })} />
          </div>
        </>
      ) : null}
    </>
  )
}
