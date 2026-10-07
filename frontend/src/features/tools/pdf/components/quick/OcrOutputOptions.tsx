import { useTranslation } from 'react-i18next'
import type { OcrOutput } from '../../services/quick-tasks'

const OUTPUTS: OcrOutput[] = ['pdf', 'text', 'docx', 'xlsx', 'csv', 'json']
export function OcrOutputOptions({ value, onChange }: { value: OcrOutput; onChange: (value: OcrOutput) => void }) {
  const { t } = useTranslation('ocr')
  return <div className="cn-ocr-options"><label>{t('output')}<select aria-label={t('output')} className="form-select" value={value} onChange={event => onChange(event.target.value as OcrOutput)}>
    {OUTPUTS.map(format => <option key={format} value={format}>{t(`outputs.${format}`)}</option>)}
  </select></label>{value === 'csv' ? <p className="erp-flow-field__hint">{t('csvHint')}</p> : null}</div>
}
