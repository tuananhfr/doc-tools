import { useId } from 'react'
import { Form, InputGroup } from 'react-bootstrap'

interface NumberFieldProps {
  label: string
  /** Chữ người dùng đang gõ — giữ nguyên, không dựng lại từ con số ("2," chưa là số). */
  value: string
  /** Đơn vị in sau ô. */
  unit?: string
  placeholder?: string
  invalid?: boolean
  onChange: (value: string) => void
}

/** Ô nhập một đại lượng: bàn phím số trên điện thoại, nhận cả dấu phẩy lẫn dấu chấm. */
export function NumberField({ label, value, unit, placeholder, invalid, onChange }: NumberFieldProps) {
  const id = useId()

  return (
    <div className="erp-flow-field">
      <label className="erp-flow-field__label" htmlFor={id}>
        {label}
      </label>
      <InputGroup hasValidation={false}>
        <Form.Control
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="erp-tool-number"
          placeholder={placeholder}
          value={value}
          isInvalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit ? <InputGroup.Text>{unit}</InputGroup.Text> : null}
      </InputGroup>
    </div>
  )
}
