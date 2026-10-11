import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (value: string) => void
  columns: string[]
  separator: ';' | '|'
  label: string
  decode?: (value: string) => string[][]
  maxRows?: number
  maxLength?: number
}

export function StructuredTextRows({ value, onChange, columns, separator, label, decode, maxRows = 100, maxLength = 1000000 }: Props) {
  const { t } = useTranslation('common')
  const id = useId()
  const [raw, setRaw] = useState(false)
  const lines = value.split('\n')
  const rows = decode ? decode(value) : lines.map(line => line.split(separator))
  const editable = rows.every(row => row.length <= columns.length)
  const update = (index: number, column: number, text: string) => {
    const next = rows.map(row => Array.from({ length: columns.length }, (_, cell) => row[cell] ?? ''))
    next[index][column] = text.replaceAll(separator, '').replace(/[\r\n]/g, '')
    onChange(next.map(row => row.join(separator)).join('\n'))
  }
  return <div className="cn-structured-rows mt-3">
    <h3 className="h6">{label}</h3>
    <Form.Check id={`${id}-raw`} type="switch" label={t('workspace.rawInput')} checked={raw || !editable} onChange={event => setRaw(event.target.checked)} />
    {raw || !editable ? <Form.Control as="textarea" rows={6} aria-label={label} maxLength={maxLength} value={value} onChange={event => onChange(event.target.value)} /> : <>
      {rows.map((row, index) => <fieldset key={index} className="border rounded p-3 mt-2"><legend className="h6 float-none w-auto px-1">{t('workspace.row', { number: index + 1 })}</legend>
        <div className="erp-tool-form__grid">{columns.map((column, cell) => <label className="erp-flow-field__label" key={cell}>{column}<Form.Control inputMode={separator === ';' ? 'decimal' : undefined} disabled={separator === ';' && cell === 0 && row[0] === '*'} maxLength={separator === '|' ? 150 : 40} value={row[cell] ?? ''} onChange={event => update(index, cell, event.target.value)} /></label>)}</div>
        {separator === ';' ? <Form.Check id={`${id}-remaining-${index}`} className="mt-2" label={t('workspace.remaining')} checked={row[0] === '*'} onChange={event => update(index, 0, event.target.checked ? '*' : '')} /> : null}
        <Button size="sm" variant="outline-danger" className="mt-2" aria-label={t('workspace.removeRow', { number: index + 1 })} onClick={() => onChange(rows.filter((_, at) => at !== index).map(row => row.join(separator)).join('\n'))}>{t('workspace.removeRow', { number: index + 1 })}</Button>
      </fieldset>)}
      <Button className="mt-2" variant="outline-secondary" disabled={rows.length >= maxRows} onClick={() => onChange([...rows.map(row => row.join(separator)), Array(columns.length).fill('').join(separator)].join('\n'))}>{t('workspace.addRow')}</Button>
    </>}
  </div>
}
