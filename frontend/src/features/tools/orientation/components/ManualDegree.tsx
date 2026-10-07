import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { parseDecimal } from '@/features/tools/hub'

interface ManualDegreeProps {
  label: string
  value: number | null
  disabled: boolean
  onChange: (azimuth: number | null) => void
}

/** Ô nhập số độ đã biết. Giá trị ngoài vào chỉ đọc lúc dựng — đổi đối tượng thì đổi `key`. */
export function ManualDegree({ label, value, disabled, onChange }: ManualDegreeProps) {
  const { t } = useTranslation('orientation')
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
      <Form.Label className="erp-flow-field__label">{t('manual.label', { target: label.toLowerCase() })}</Form.Label>
      <div className="erp-orient-degree">
        <Form.Control
          inputMode="decimal"
          value={text}
          placeholder={t('manual.placeholder')}
          isInvalid={invalid}
          disabled={disabled}
          onChange={(event) => update(event.target.value)}
        />
        <span className="erp-orient-degree__unit" aria-hidden="true">
          °
        </span>
      </div>
      <Form.Text className="erp-flow-field__hint">{t('manual.hint')}</Form.Text>
      {invalid ? <Form.Control.Feedback type="invalid" className="d-block">{t('manual.invalid')}</Form.Control.Feedback> : null}
    </Form.Group>
  )
}
