import { useId } from 'react'
import { Form } from 'react-bootstrap'

export interface FlowChoiceOption<T extends string> {
  value: T
  label: string
  /** Một dòng nói lựa chọn này hợp với việc gì. */
  hint?: string
}

interface FlowChoiceProps<T extends string> {
  inline?: boolean
  legend: string
  value: T
  options: FlowChoiceOption<T>[]
  onChange: (value: T) => void
}

/** Nhóm nút chọn một trong vài phương án ở cột tuỳ chọn của công cụ nhanh. */
export function FlowChoice<T extends string>({ legend, value, options, onChange, inline = false }: FlowChoiceProps<T>) {
  const ids = useId()

  return (
    <div className="erp-flow-field" role="radiogroup" aria-labelledby={`${ids}-legend`}>
      <span id={`${ids}-legend`} className="erp-flow-field__label">
        {legend}
      </span>
      {inline ? <div className="erp-flow-choice erp-flow-choice--inline">{options.map(option => <label key={option.value} className="erp-flow-choice__option"><input type="radio" name={ids} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} /><span>{option.label}</span></label>)}</div> : <div className="erp-flow-choice">
        {options.map((option) => (
          <Form.Check
            key={option.value}
            type="radio"
            id={`${ids}-${option.value}`}
            name={ids}
            className="erp-flow-choice__item"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            label={
              <>
                <span className="erp-flow-choice__name">{option.label}</span>
                {option.hint ? <span className="erp-flow-choice__hint">{option.hint}</span> : null}
              </>
            }
          />
        ))}
      </div>}
    </div>
  )
}
