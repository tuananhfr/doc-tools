import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { SCOPE_MODE, type PageScope, type ScopeMode } from '../types/decorations.types'

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

/**
 * Ô số cho phép xoá trắng để gõ lại: chỉ đẩy lên khi giá trị hợp lệ, rời ô thì
 * trả về giá trị đang áp. Ô số "controlled" thẳng thì xoá chữ số cuối là bị điền lại ngay.
 */
export function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState<{ text: string; value: number } | null>(null)
  // Giá trị đổi từ ngoài (hoàn tác) thì bỏ bản nháp cũ.
  const text = draft && draft.value === value ? draft.text : String(value)
  const valid = text.trim() !== '' && Number.isInteger(Number(text)) && Number(text) >= min && Number(text) <= max

  return (
    <Form.Group controlId={id}>
      <Form.Label className="erp-doc-export__label">{label}</Form.Label>
      <Form.Control
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        isInvalid={!valid}
        onChange={(event) => {
          const next = event.target.value
          const number = Number(next)
          if (next.trim() !== '' && Number.isInteger(number) && number >= min && number <= max) {
            setDraft({ text: next, value: number })
            onChange(number)
          } else {
            setDraft({ text: next, value })
          }
        }}
        onBlur={() => setDraft(null)}
      />
      <Form.Control.Feedback type="invalid">
        Từ {min} đến {max}.
      </Form.Control.Feedback>
    </Form.Group>
  )
}

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}

export function RangeField({ label, value, min, max, step, format, onChange }: RangeFieldProps) {
  const id = useId()
  return (
    <Form.Group controlId={id} className="erp-doc-range">
      <div className="erp-doc-range__head">
        <Form.Label className="erp-doc-export__label mb-0">{label}</Form.Label>
        <output htmlFor={id} className="erp-doc-range__value">
          {format(value)}
        </output>
      </div>
      <Form.Range min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Form.Group>
  )
}

const SCOPE_LABEL: Record<ScopeMode, string> = {
  all: 'Mọi trang',
  skipFirst: 'Bỏ trang đầu (trang bìa)',
  range: 'Theo khoảng trang',
}

interface ScopeFieldProps {
  value: PageScope
  error: string | undefined
  onChange: (scope: PageScope, mergeKey?: string) => void
  mergeKey: string
}

/** Áp lên trang nào — số trang là vị trí HIỆN TẠI trên lưới, như ô "Tách PDF". */
export function ScopeField({ value, error, onChange, mergeKey }: ScopeFieldProps) {
  const id = useId()
  return (
    <div className="erp-doc-scope">
      <Form.Group controlId={`${id}-mode`}>
        <Form.Label className="erp-doc-export__label">Áp lên</Form.Label>
        <Form.Select value={value.mode} onChange={(event) => onChange({ ...value, mode: event.target.value as ScopeMode })}>
          {Object.values(SCOPE_MODE).map((mode) => (
            <option key={mode} value={mode}>
              {SCOPE_LABEL[mode]}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      {value.mode === 'range' ? (
        <Form.Group controlId={`${id}-range`}>
          <Form.Label visuallyHidden>Khoảng trang áp dụng</Form.Label>
          <Form.Control
            value={value.range}
            placeholder="Ví dụ: 2-10, 12"
            isInvalid={!!error}
            onChange={(event) => onChange({ ...value, range: event.target.value }, mergeKey)}
          />
          <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
        </Form.Group>
      ) : null}
    </div>
  )
}
