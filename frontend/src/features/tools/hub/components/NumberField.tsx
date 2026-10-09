import { useId } from 'react'
import type { ReactNode } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { checkNumber, formatQuantity, type NumberRule } from '../utils/number-input'

interface NumberFieldProps {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  /** Hằng khai ngoài component — trang đọc số bằng `readNumber(value, rule)` với CHÍNH luật này. */
  rule: NumberRule
  /** Đơn vị in sau con số đã hiểu ("đ", "%", "kWh"). */
  unit?: string
  placeholder?: string
  className?: string
}

/**
 * Ô nhập số kiểu Việt ("30.000.000", "2,5"). Là ô chữ chứ không phải `type="number"`:
 * ô số của trình duyệt gọt dấu chấm / phẩy im lặng nên con số hiểu ra sai cả triệu lần.
 * Đọc khác cách người gõ viết thì in lại con số đã hiểu ngay dưới ô.
 */
export function NumberField({ label, value, onChange, rule, unit, placeholder, className }: NumberFieldProps) {
  const { t } = useTranslation('common')
  const id = useId()
  const noteId = `${id}-note`
  const checked = checkNumber(value, rule)
  const shown = checked.state === 'ok' || checked.state === 'range' || checked.state === 'integer' ? checked.value : null
  const formatted = shown === null ? '' : formatQuantity(shown)
  // Gõ đúng như cách app in ra thì không cần nhắc lại.
  const echo = checked.state === 'ok' && formatted.replace(/\s/g, '') !== value.replace(/\s/g, '')
  const { min, max } = rule
  const range = min !== undefined && max !== undefined ? t('number.between', { min: formatQuantity(min), max: formatQuantity(max) })
    : min !== undefined ? t('number.atLeast', { min: formatQuantity(min) }) : t('number.atMost', { max: formatQuantity(max ?? 0) })
  const error = checked.state === 'invalid' ? t('number.invalid')
    : checked.state === 'integer' ? t('number.integer')
      // Kèm con số đã hiểu: "2.5.5" đọc ra 255 (dấu chấm lặp = nhóm nghìn), chỉ báo khoảng thì người gõ không biết vì sao.
      : checked.state === 'range' ? `${range} ${t('number.understood', { value: unit ? `${formatted} ${unit}` : formatted })}` : ''

  return <label className={`erp-flow-field__label${className ? ` ${className}` : ''}`} htmlFor={id}>{label}
    <Form.Control
      id={id}
      type="text"
      inputMode={rule.kind === 'integer' ? 'numeric' : 'decimal'}
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      isInvalid={error !== ''}
      aria-describedby={error || echo ? noteId : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
    {error ? <span id={noteId} className="erp-tool-form__error" role="alert">{error}</span>
      : echo ? <span id={noteId} className="erp-flow-field__hint">{t('number.understood', { value: unit ? `${formatted} ${unit}` : formatted })}</span> : null}
  </label>
}
