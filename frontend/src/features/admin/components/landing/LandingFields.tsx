import { createContext, useContext, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'

/** The server rejects a draft by naming one field ("cases.items.1.title"); that field shows the message. */
export const LandingFieldError = createContext<{ field: string; message: string } | null>(null)

function useFieldError(path: string) {
  const error = useContext(LandingFieldError)
  return error?.field === path ? error.message : null
}

function FieldMessage({ id, message }: { id: string; message: string | null }) {
  return message ? <span id={id} className="cn-admin-error" role="alert"><Icon name="exclamation-circle" />{message}</span> : null
}

interface TextFieldProps {
  label: string
  path: string
  value: string
  max: number
  onChange: (value: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
  hint?: ReactNode
  type?: 'text' | 'url'
}

/** Plain text only: the page shows markup literally and collapses line breaks, so the input never offers them. */
export function TextField({ label, path, value, max, onChange, required = false, multiline = false, placeholder, hint, type = 'text' }: TextFieldProps) {
  const message = useFieldError(path)
  const describedBy = message ? `${path}-error` : undefined
  const common = {
    name: path, value, required, placeholder, maxLength: max, 'aria-invalid': message ? true : undefined, 'aria-describedby': describedBy,
  }
  return (
    <label className="cn-admin-lfield">
      <span className="cn-admin-lfield__head">
        <span>{label}{required ? null : <span className="cn-admin-lfield__optional"> (không bắt buộc)</span>}</span>
        <span className="cn-admin-lfield__count" aria-hidden="true">{[...value].length}/{max}</span>
      </span>
      {multiline
        ? <textarea rows={3} {...common} onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, ' '))} />
        : <input type={type} spellCheck={type === 'text'} {...common} onChange={(event) => onChange(event.target.value)} />}
      {hint ? <span className="cn-admin-sub">{hint}</span> : null}
      <FieldMessage id={`${path}-error`} message={message} />
    </label>
  )
}

export function SelectField({ label, path, value, onChange, children }: { label: string; path: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  const message = useFieldError(path)
  return (
    <label className="cn-admin-lfield">
      <span className="cn-admin-lfield__head"><span>{label}</span></span>
      <select name={path} value={value} aria-invalid={message ? true : undefined} onChange={(event) => onChange(event.target.value)}>{children}</select>
      <FieldMessage id={`${path}-error`} message={message} />
    </label>
  )
}

/** One block of the page; blocks are fixed, so this is a heading and its fields, nothing to add or reorder. */
export function LandingBlock({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="cn-admin-panel cn-admin-lblock" id={id} aria-labelledby={`${id}-title`}>
      <header className="cn-admin-lblock__head">
        <h2 id={`${id}-title`}>{title}</h2>
        {description ? <p className="cn-admin-lead">{description}</p> : null}
      </header>
      <div className="cn-admin-lblock__body">{children}</div>
    </section>
  )
}

/** One of the three cards of a block. */
export function LandingItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="cn-admin-fieldset cn-admin-litem">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}
