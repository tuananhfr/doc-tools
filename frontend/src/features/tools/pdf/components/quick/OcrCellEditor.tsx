import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OcrTable, OcrCell } from '../../types/ocr-layout.types'
import type { OcrWordResult } from '../../types/ocr-result.types'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import { cellReviewValue } from '../../utils/ocr-review-layout'
import { OcrCellPreview } from './OcrCellPreview'

export function OcrCellEditor({ table, words, item, onChange }: { table: OcrTable; words: OcrWordResult[]; item: OcrReviewPage; onChange: (cell: OcrCell, value: string) => void }) {
  const { t } = useTranslation('ocr')
  const [selected, setSelected] = useState(table.cells[0]?.id)
  const index = Math.max(0, table.cells.findIndex(cell => cell.id === selected)), cell = table.cells[index]
  if (!cell) return null
  return <div className="cn-ocr-cell-editor">
    <label>{t('selectedCell')}<select aria-label={t('selectedCell')} className="form-select" value={cell.id} onChange={event => setSelected(event.target.value)}>
      {table.cells.map(current => <option key={current.id} value={current.id}>{t('cell', { row: current.row + 1, column: current.column + 1 })}</option>)}
    </select></label>
    <OcrCellPreview item={item} cell={cell} />
    <label>{t('cellValue')}<input className="form-control" value={cellReviewValue(cell, words)} onChange={event => onChange(cell, event.target.value)} /></label>
    {cell.proposal && !cell.verified ? <small>{t('cellProposal', { pass: t(`passNames.${cell.proposal.pass}`) })}</small> : null}
    <div className="cn-ocr-cell-editor__navigation">
      <button type="button" className="btn btn-outline-secondary" disabled={index === 0} onClick={() => setSelected(table.cells[index - 1].id)}>{t('previousCell')}</button>
      <span>{index + 1} / {table.cells.length}</span>
      <button type="button" className="btn btn-outline-secondary" disabled={index === table.cells.length - 1} onClick={() => setSelected(table.cells[index + 1].id)}>{t('nextCell')}</button>
    </div>
  </div>
}
