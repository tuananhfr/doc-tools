import { useId } from 'react'
import { Form } from 'react-bootstrap'
import type { FormField, FormValue } from '../types/form.types'

interface FormFieldInputProps {
  field: FormField
  value: FormValue
  /** Vị trí trang trong tài liệu đang dựng — ô cùng tên giữa hai trang dễ nhầm. */
  position: number
  disabled: boolean
  onChange: (value: FormValue) => void
}

function FieldLabel({ field, position, htmlFor }: { field: FormField; position: number; htmlFor?: string }) {
  const text = (
    <>
      {field.label}
      {field.required ? (
        <span className="erp-doc-form__required" title="Bắt buộc">
          {' '}*
        </span>
      ) : null}
    </>
  )
  return (
    <div className="erp-doc-form__label-row">
      {htmlFor ? (
        <label className="erp-doc-export__label mb-0" htmlFor={htmlFor}>
          {text}
        </label>
      ) : (
        <span className="erp-doc-export__label mb-0">{text}</span>
      )}
      <span className="erp-doc-form__page">tr. {position}</span>
    </div>
  )
}

const asList = (value: FormValue) => (Array.isArray(value) ? value : [])

/** Một trường form theo đúng loại ô của PDF: chữ, ô chọn, nhóm radio, danh sách. */
export function FormFieldInput({ field, value, position, disabled, onChange }: FormFieldInputProps) {
  const id = useId()
  const locked = disabled || field.readOnly
  const readOnlyNote = field.readOnly ? <p className="erp-doc-export__note mb-0">Chỉ đọc — người soạn form đã khoá ô này.</p> : null

  if (field.kind === 'checkbox') {
    return (
      <div className="erp-doc-form__field">
        <div className="erp-doc-form__label-row">
          <Form.Check id={id} type="checkbox" checked={value === true} disabled={locked} label={field.label} onChange={(event) => onChange(event.target.checked)} />
          <span className="erp-doc-form__page">tr. {position}</span>
        </div>
        {readOnlyNote}
      </div>
    )
  }

  if (field.kind === 'radio' || (field.kind === 'list' && field.multiSelect)) {
    const chosen = asList(value)
    return (
      <fieldset className="erp-doc-form__field">
        <legend className="visually-hidden">{field.label}</legend>
        <FieldLabel field={field} position={position} />
        <div className="erp-doc-form__choices">
          {field.options.map((option, index) =>
            field.kind === 'radio' ? (
              <Form.Check
                key={option}
                type="radio"
                id={`${id}-${index}`}
                name={id}
                label={option}
                checked={value === option}
                disabled={locked}
                onChange={() => onChange(option)}
              />
            ) : (
              <Form.Check
                key={option}
                type="checkbox"
                id={`${id}-${index}`}
                label={option}
                checked={chosen.includes(option)}
                disabled={locked}
                onChange={(event) => onChange(event.target.checked ? [...chosen, option] : chosen.filter((item) => item !== option))}
              />
            ),
          )}
        </div>
        {readOnlyNote}
      </fieldset>
    )
  }

  if (field.kind === 'dropdown' || field.kind === 'list') {
    const [current = ''] = asList(value)
    return (
      <div className="erp-doc-form__field">
        <FieldLabel field={field} position={position} htmlFor={id} />
        {field.editable ? (
          // Ô thả xuống cho gõ tự do: gợi ý danh sách nhưng không ép chọn trong đó.
          <>
            <Form.Control id={id} list={`${id}-options`} value={current} disabled={locked} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])} />
            <datalist id={`${id}-options`}>
              {field.options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </>
        ) : (
          <Form.Select id={id} value={current} disabled={locked} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}>
            <option value="">— Chưa chọn —</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Form.Select>
        )}
        {readOnlyNote}
      </div>
    )
  }

  const text = typeof value === 'string' ? value : ''
  const common = { id, value: text, maxLength: field.maxLength, disabled: locked }
  return (
    <div className="erp-doc-form__field">
      <FieldLabel field={field} position={position} htmlFor={id} />
      {field.multiline ? (
        <Form.Control {...common} as="textarea" rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Form.Control {...common} onChange={(event) => onChange(event.target.value)} />
      )}
      {field.maxLength ? (
        <p className="erp-doc-export__note mb-0">
          {text.length}/{field.maxLength} ký tự
        </p>
      ) : null}
      {readOnlyNote}
    </div>
  )
}
