import { useTranslation } from 'react-i18next'
import type { OcrTable } from '../../types/ocr-layout.types'
import type { OcrWordResult } from '../../types/ocr-result.types'
import { cellReviewValue } from '../../utils/ocr-review-layout'
import { mergeOcrCells, resizeOcrTable, splitOcrCell } from '../../utils/ocr-table-edit'

export function OcrTableReview({ table, words, onChange, onConfirm }: { table: OcrTable; words: OcrWordResult[]; onChange: (table: OcrTable) => void; onConfirm: () => void }) {
  const { t } = useTranslation('ocr')
  return <section className="cn-ocr-table"><h3>{t('table')}</h3><p>{t('tableHint')}</p>
    <div className="cn-ocr-table__size">
      <label>{t('rows')}<input className="form-control" type="number" min="1" max="64" value={table.rows} onChange={event => onChange(resizeOcrTable(table, Number(event.target.value), table.columns))} /></label>
      <label>{t('columns')}<input className="form-control" type="number" min="1" max="16" value={table.columns} onChange={event => onChange(resizeOcrTable(table, table.rows, Number(event.target.value)))} /></label>
    </div>
    <div className="cn-ocr-table__scroll" tabIndex={0} role="region" aria-label={t('table')}><table><tbody>
      {Array.from({ length: table.rows }, (_, row) => <tr key={row}>{table.cells.filter(cell => cell.row === row).map(cell => <td key={cell.id} colSpan={cell.columnSpan} rowSpan={cell.rowSpan}>
        <input className="form-control" aria-label={t('cell', { row: row + 1, column: cell.column + 1 })} value={cellReviewValue(cell, words)} onChange={event => onChange({ ...table, verifiedAt: null, cells: table.cells.map(current => current.id !== cell.id ? current : { ...current, verified: { value: event.target.value, at: new Date().toISOString(), by: 'local-user' } }) })} />
        {cell.proposal && !cell.verified ? <small>{t('cellProposal', { pass: t(`passNames.${cell.proposal.pass}`) })}</small> : null}
        <div>{cell.column + cell.columnSpan < table.columns ? <button className="btn btn-link btn-sm" type="button" onClick={() => onChange(mergeOcrCells(table, cell.id))}>{t('mergeRight')}</button> : null}
          {cell.row + cell.rowSpan < table.rows ? <button className="btn btn-link btn-sm" type="button" onClick={() => onChange(mergeOcrCells(table, cell.id, 'down'))}>{t('mergeDown')}</button> : null}
          {cell.columnSpan > 1 || cell.rowSpan > 1 ? <button className="btn btn-link btn-sm" type="button" onClick={() => onChange(splitOcrCell(table, cell.id))}>{t('splitCell')}</button> : null}</div>
      </td>)}</tr>)}
    </tbody></table></div>
    <button className="btn btn-primary" type="button" onClick={onConfirm}>{t('confirmTable')}</button>
  </section>
}
