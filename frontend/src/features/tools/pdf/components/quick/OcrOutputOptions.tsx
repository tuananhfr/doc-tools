import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import { Icon } from '@/components/ui'
import type { OcrOutput } from '../../services/quick-tasks'

const OUTPUTS: OcrOutput[] = ['pdf', 'text', 'docx', 'xlsx', 'csv', 'json']
const TILES = { pdf: ['PDF', 'file-earmark-pdf-fill'], text: ['TXT', 'file-earmark-text-fill'], docx: ['Word', 'file-earmark-word-fill'], xlsx: ['Excel', 'file-earmark-excel-fill'], csv: ['CSV', 'file-earmark-spreadsheet-fill'], json: ['JSON', 'file-earmark-code-fill'] } as const
export function OcrOutputOptions({ value, onChange, tiles = false }: { value: OcrOutput; onChange: (value: OcrOutput) => void; tiles?: boolean }) {
  const { t } = useTranslation('ocr')
  const id = useId()
  if (tiles) return <><fieldset className="cn-fileconversion-formats cn-ocr-format-tiles"><legend>{t('output')}</legend><div>{OUTPUTS.map(format => <label key={format} className={`cn-fileconversion-format cn-fileconversion-format--${format}`}><input className="visually-hidden" type="radio" name={`${id}-format`} checked={value === format} aria-label={t(`outputs.${format}`)} onChange={() => onChange(format)} /><span aria-hidden="true"><Icon name={TILES[format][1]} /></span><strong>{TILES[format][0]}</strong></label>)}</div></fieldset>{value === 'csv' ? <p className="erp-flow-field__hint">{t('csvHint')}</p> : null}</>
  return <div className="cn-ocr-options"><label>{t('output')}<select aria-label={t('output')} className="form-select" value={value} onChange={event => onChange(event.target.value as OcrOutput)}>
    {OUTPUTS.map(format => <option key={format} value={format}>{t(`outputs.${format}`)}</option>)}
  </select></label>{value === 'csv' ? <p className="erp-flow-field__hint">{t('csvHint')}</p> : null}</div>
}
