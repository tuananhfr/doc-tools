import { useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import { confirmOcrWord, needsOcrReview } from '../../utils/ocr-review'
import { OcrWordPreview } from './OcrWordPreview'

export function OcrReview({ pages: initial, onComplete }: { pages: OcrReviewPage[]; onComplete: (pages: OcrReviewPage[]) => void }) {
  const { t } = useTranslation('pdf')
  const [pages, setPages] = useState(initial)
  const [pageIndex, setPageIndex] = useState(0)
  const [wordIndex, setWordIndex] = useState(() => Math.max(0, initial[0].result.words.findIndex(needsOcrReview)))
  const [draft, setDraft] = useState<string | null>(null)
  const [previewReady, setPreviewReady] = useState(false)
  const item = pages[pageIndex]
  const word = item.result.words[wordIndex]
  const remaining = pages.reduce((count, page) => count + page.result.words.filter(needsOcrReview).length, 0)
  const selectWord = (index: number) => { setWordIndex(index); setDraft(null) }
  const confirm = () => {
    if (!word) return
    const updated = pages.map((page, index) => index !== pageIndex ? page : { ...page, result: { ...page.result, words: page.result.words.map((current, i) => i === wordIndex ? confirmOcrWord(current, draft ?? current.verifiedValue ?? current.normalizedText) : current) } })
    setPages(updated)
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
    {item.result.qualityFlags.length ? <ul className="cn-ocr-review__warnings">{item.result.qualityFlags.map(flag => <li key={flag}>{t(`ocrReview.quality.${flag}`)}</li>)}</ul> : null}
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
        <label htmlFor="ocr-word-value">{t('ocrReview.value')}</label>
        <input id="ocr-word-value" className="form-control" value={draft ?? word.verifiedValue ?? word.normalizedText} onChange={event => setDraft(event.target.value)} />
        <p className="cn-ocr-review__hint">{t('ocrReview.discardHint')}</p>
        <Button disabled={!previewReady} onClick={confirm}>{t('ocrReview.confirm')}</Button>
      </div> : null}
    </div>
    <footer>
      <p>{t('ocrReview.privacy')}</p>
      <Button disabled={remaining > 0 || draft !== null} onClick={() => onComplete(pages)}>{t('ocrReview.export')}</Button>
    </footer>
  </section>
}
