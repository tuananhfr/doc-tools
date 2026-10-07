import { useTranslation } from 'react-i18next'
import type { OcrField } from '../../types/ocr-layout.types'

export function OcrFieldsReview({ fields, onChange, onConfirm }: { fields: OcrField[]; onChange: (field: OcrField, value: string) => void; onConfirm: (field: OcrField) => void }) {
  const { t } = useTranslation('ocr')
  if (!fields.length) return null
  return <section className="cn-ocr-fields"><h3>{t('fields')}</h3>{fields.map(field => <div key={field.id}>
    <label>{field.label}<input className="form-control" value={field.draftValue ?? field.verified?.value ?? field.rawText} onChange={event => onChange(field, event.target.value)} /></label>
    <button className="btn btn-outline-primary" type="button" onClick={() => onConfirm(field)}>{t('confirmField')}</button>
  </div>)}</section>
}
