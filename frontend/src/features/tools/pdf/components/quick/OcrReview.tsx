import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import { confirmOcrWord, needsOcrReview } from '../../utils/ocr-review'
import { OcrWordPreview } from './OcrWordPreview'
import { OcrCandidates } from './OcrCandidates'
import { OcrPagePreview } from './OcrPagePreview'
import { OcrTableReview } from './OcrTableReview'
import { OcrFieldsReview } from './OcrFieldsReview'
import { OcrValidationPanel } from './OcrValidationPanel'
import { validateOcrFields, validateOcrTable } from '../../utils/ocr-validation'
import { confirmOcrField, confirmOcrTable } from '../../utils/ocr-review-layout'
import { resizeOcrTable } from '../../utils/ocr-table-edit'
import type { OcrPageResult } from '../../types/ocr-result.types'

export function OcrReview({ pages: initial, onComplete }: { pages: OcrReviewPage[]; onComplete: (pages: OcrReviewPage[]) => void }) {
  const { t } = useTranslation('pdf')
  const { t: o } = useTranslation('ocr')
  const [pages, setPages] = useState(initial)
  const [history, setHistory] = useState<OcrReviewPage[][]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [wordIndex, setWordIndex] = useState(() => Math.max(0, initial[0].result.words.findIndex(needsOcrReview)))
  const [draft, setDraft] = useState<string | null>(null)
  const [previewReady, setPreviewReady] = useState(false)
  const [structuredReady, setStructuredReady] = useState(false)
  const item = pages[pageIndex]
  const word = item.result.words[wordIndex]
  const remaining = pages.reduce((count, page) => count + page.result.words.filter(needsOcrReview).length, 0)
  const findings = pages.flatMap((page, index) => [...validateOcrFields(page.result.layout?.fields ?? []), ...(page.result.layout?.tables ?? []).flatMap(validateOcrTable)].map(finding => ({ ...finding, id: `${index}:${finding.id}`, targetId: `${index}:${finding.targetId}` })))
  const update = (result: OcrPageResult) => {
    setHistory(previous => [...previous.slice(-19), pages])
    setPages(pages.map((page, index) => index === pageIndex ? { ...page, result } : page))
  }
  const selectWord = (index: number) => { setWordIndex(index); setDraft(null) }
  const confirm = () => {
    if (!word) return
    const words = item.result.words.map((current, index) => index === wordIndex ? confirmOcrWord(current, draft ?? current.verifiedValue ?? current.normalizedText) : current)
    const layout = item.result.layout ? { ...item.result.layout,
      tables: item.result.layout.tables.map(table => table.cells.some(cell => cell.wordIds.includes(word.id) || word.id === `manual-${cell.id}`) ? { ...table, verifiedAt: null, cells: table.cells.map(cell => cell.wordIds.includes(word.id) || word.id === `manual-${cell.id}` ? { ...cell, verified: null, proposal: undefined } : cell) } : table),
      fields: item.result.layout.fields.map(field => field.wordIds.includes(word.id) ? { ...field, verified: null, draftValue: field.wordIds.map(id => words.find(current => current.id === id)).filter(current => current !== undefined).map(current => current.verifiedValue ?? current.normalizedText).filter(Boolean).join(' ') } : field),
    } : undefined
    const updated = pages.map((page, index) => index !== pageIndex ? page : { ...page, result: { ...page.result, words, layout } })
    setPages(updated)
    setHistory(previous => [...previous.slice(-19), pages])
    setDraft(null)
    const next = updated.flatMap((page, p) => page.result.words.flatMap((current, w) => needsOcrReview(current) ? [{ p, w }] : []))[0]
    if (next) { setPageIndex(next.p); setWordIndex(next.w) }
  }
  return <section className="cn-ocr-review" aria-labelledby="ocr-review-title">
    <header>
      <p className="cn-ocr-review__eyebrow">{t('ocrReview.step')}</p>
      <h2 id="ocr-review-title">{t('ocrReview.title')}</h2>
      <p>{t('ocrReview.intro')}</p>
      <p className="cn-ocr-review__remaining" role="status">{t('ocrReview.remaining', { count: remaining })}</p>
    </header>
    <label className="cn-ocr-review__page">
      <span>{t('ocrReview.page')}</span>
      <select className="form-select" value={pageIndex} disabled={draft !== null} onChange={event => {
        const index = Number(event.target.value)
        setPageIndex(index)
        setWordIndex(Math.max(0, pages[index].result.words.findIndex(needsOcrReview)))
        setDraft(null)
      }}>
        {pages.map((page, index) => <option key={page.page.id} value={index}>{page.source.name} · {page.page.pageIndex + 1}</option>)}
      </select>
    </label>
    {item.result.qualityFlags.length ? <ul className="cn-ocr-review__warnings">{item.result.qualityFlags.map(flag => <li key={flag}>{o(`quality.${flag}`)}</li>)}</ul> : null}
    <Button variant="outline-secondary" disabled={!history.length || draft !== null} onClick={() => {
      const previous = history.at(-1)!
      setPages(previous); setHistory(history.slice(0, -1)); setWordIndex(Math.min(wordIndex, previous[pageIndex].result.words.length - 1)); setDraft(null)
    }}>{o('undo')}</Button>
    <div className="cn-ocr-review__body">
      <div className="cn-ocr-review__words" role="group" aria-label={t('ocrReview.words')}>
        {item.result.words.map((current, index) => <button type="button" key={current.id} aria-pressed={index === wordIndex} disabled={draft !== null} onClick={() => selectWord(index)}
          className={`cn-ocr-review__word${needsOcrReview(current) ? ' needs-review' : ''}${current.verifiedValue !== null ? ' is-verified' : ''}`}>
          {current.verifiedValue === '' ? '∅' : current.verifiedValue ?? current.normalizedText}
          <span className="visually-hidden"> · {t(current.verifiedValue !== null ? 'ocrReview.verified' : needsOcrReview(current) ? 'ocrReview.required' : 'ocrReview.high')}</span>
        </button>)}
        {!word ? <p>{t('ocrReview.empty')}</p> : null}
      </div>
      {word ? <div className="cn-ocr-review__editor">
        <span>{t('ocrReview.original')}</span>
        <OcrWordPreview item={item} word={word} onReady={setPreviewReady} />
        <p className="cn-ocr-review__raw">{t('ocrReview.recognized')}: <strong>{word.rawText}</strong></p>
        <p>{t('ocrReview.confidence')}: {Math.round(word.confidence)}/100 · {t(`ocrReview.level.${word.confidenceLevel}`)}</p>
        <OcrCandidates word={word} onSelect={setDraft} />
        <label htmlFor="ocr-word-value">{t('ocrReview.value')}</label>
        <input id="ocr-word-value" className="form-control" value={draft ?? word.verifiedValue ?? word.normalizedText} onChange={event => setDraft(event.target.value)} />
        <p className="cn-ocr-review__hint">{t('ocrReview.discardHint')}</p>
        <Button disabled={!previewReady} onClick={confirm}>{t('ocrReview.confirm')}</Button>
      </div> : null}
    </div>
    <fieldset disabled={draft !== null} className="cn-ocr-structured">
      {item.result.layout?.tables.length || item.result.layout?.fields.length || item.result.pipeline?.profile === 'table' ? <OcrPagePreview item={item} onReady={setStructuredReady} /> : null}
      <fieldset disabled={!structuredReady}>
      {item.result.layout?.tables.map(table => <OcrTableReview key={table.id} table={table} words={item.result.words}
        onChange={next => update({ ...item.result, layout: { ...item.result.layout!, tables: item.result.layout!.tables.map(current => current.id === next.id ? next : current) } })}
        onConfirm={() => update(confirmOcrTable(item.result, table))} />)}
      {item.result.pipeline?.profile === 'table' && !item.result.layout?.tables.length ? <div><p>{o('tableMissing')}</p><Button variant="outline-primary" onClick={() => update({ ...item.result, layout: { regions: item.result.layout?.regions ?? [], fields: [], tables: [resizeOcrTable({ id: 'table-0', rows: 0, columns: 0, cells: [], origin: 'manual', verifiedAt: null }, 2, 2)] } })}>{o('createTable')}</Button></div> : null}
      <OcrFieldsReview fields={item.result.layout?.fields ?? []}
        onChange={(field, value) => update({ ...item.result, layout: { ...item.result.layout!, fields: item.result.layout!.fields.map(current => current.id === field.id ? { ...current, draftValue: value, verified: null } : current) } })}
        onConfirm={field => update(confirmOcrField(item.result, field, field.draftValue ?? field.verified?.value ?? field.rawText))} />
      </fieldset>
    </fieldset>
    <OcrValidationPanel findings={findings} labels={Object.fromEntries(pages.flatMap((page, index) => [
      ...(page.result.layout?.fields ?? []).map(field => [`${index}:${field.id}`, `${t('ocrReview.page')} ${index + 1}: ${field.label}`]),
      ...(page.result.layout?.tables ?? []).flatMap(table => [[`${index}:${table.id}`, `${t('ocrReview.page')} ${index + 1}: ${o('table')}`], ...table.cells.map(cell => [`${index}:${cell.id}`, `${t('ocrReview.page')} ${index + 1}: ${o('cell', { row: cell.row + 1, column: cell.column + 1 })}`])]),
    ]))} />
    <footer>
      <p>{t('ocrReview.privacy')}</p>
      <Button disabled={remaining > 0 || draft !== null || findings.some(finding => finding.severity === 'error')} onClick={() => onComplete(pages)}>{t('ocrReview.export')}</Button>
    </footer>
  </section>
}
