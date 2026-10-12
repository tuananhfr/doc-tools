import { useEffect, useRef, useState } from 'react'
import { Button, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FilePicker, megabytes, TOOL_LIMITS } from '@/features/tools/hub'
import { OcrReview } from '@/features/tools/pdf/components/quick/OcrReview'
import type { OcrReviewPage } from '@/features/tools/pdf/hooks/useOcrReview'
import { numberFormat } from '@/i18n/intl'
import { READ_FILE_MAX_BYTES, READ_OCR_MAX_PAGES } from '../config/read-listen'
import type { PdfPendingReview, PdfReadProgress } from '../services/pdf-to-text'
import { completePdfReview, readFile, releaseReadFile } from '../services/read-file'
import type { ReadErrorCode, ReadSource } from '../types/read-listen.types'
import { ReadErrorNotice } from './ReadErrorNotice'

const ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const formatCount = (value: number) => numberFormat().format(value)

interface ReadFilePanelProps {
  source: ReadSource | null
  onSource: (source: ReadSource | null) => void
  onPasteInstead: () => void
  disabled: boolean
}

type Phase =
  | { step: 'idle' }
  | { step: 'reading'; progress: PdfReadProgress | null }
  | { step: 'review'; pending: PdfPendingReview }
  | { step: 'error'; code: ReadErrorCode; detail?: string }

interface Detail {
  encoding?: string
  skippedPages: number
  reviewed: boolean
}

/** Thẻ "Tệp": PDF/DOCX/TXT đọc trên máy; trang scan phải qua khung kiểm tra OCR rồi mới thành văn bản để nghe. */
export default function ReadFilePanel({ source, onSource, onPasteInstead, disabled }: ReadFilePanelProps) {
  const { t } = useTranslation('accessibility')
  // `ingestFile` và `OcrReview` dịch bằng namespace pdf/ocr — phải nạp trước, `translate()` không tự nạp.
  useTranslation(['pdf', 'ocr'])
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [detail, setDetail] = useState<Detail | null>(null)
  const job = useRef<AbortController | null>(null)

  useEffect(() => () => {
    job.current?.abort()
    releaseReadFile()
  }, [])

  const cancel = () => {
    job.current?.abort()
    job.current = null
    setPhase({ step: 'idle' })
  }

  const choose = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    job.current?.abort()
    const controller = new AbortController()
    job.current = controller
    onSource(null)
    setDetail(null)
    setPhase({ step: 'reading', progress: null })
    const outcome = await readFile(file, controller.signal, (progress) => { if (job.current === controller) setPhase({ step: 'reading', progress }) })
    // Đã huỷ hoặc đã chọn tệp khác trong lúc đọc: bỏ kết quả cũ.
    if (job.current !== controller) return
    job.current = null
    if (outcome.kind === 'error') setPhase({ step: 'error', code: outcome.code, detail: outcome.reason })
    else if (outcome.kind === 'review') setPhase({ step: 'review', pending: outcome.pending })
    else {
      setPhase({ step: 'idle' })
      setDetail({ encoding: outcome.encoding, skippedPages: outcome.skippedPages, reviewed: false })
      onSource(outcome.source)
    }
  }

  const completeReview = (pending: PdfPendingReview, pages: OcrReviewPage[]) => {
    const outcome = completePdfReview(pending, pages)
    if (outcome.kind !== 'done') {
      setPhase({ step: 'error', code: outcome.kind === 'error' ? outcome.code : 'OCR_UNCERTAIN' })
      return
    }
    setPhase({ step: 'idle' })
    setDetail({ skippedPages: outcome.skippedPages, reviewed: true })
    onSource(outcome.source)
  }

  if (phase.step === 'review') {
    const { pending } = phase
    return <div className="erp-read-file">
      <ReadErrorNotice code="OCR_UNCERTAIN" onPasteInstead={onPasteInstead} />
      <p className="erp-tool-result__note mt-2">{t('readAloud.ocrIntro', { pages: formatCount(pending.review.length) })}</p>
      {pending.skippedPages ? <p className="erp-tool-result__note">{t('readAloud.ocrSkipped', { max: formatCount(READ_OCR_MAX_PAGES), skipped: formatCount(pending.skippedPages) })}</p> : null}
      <OcrReview pages={pending.review} onComplete={(pages) => completeReview(pending, pages)} />
      <Button variant="outline-secondary" className="erp-read-notice__action mt-2" onClick={cancel}>{t('readAloud.fileCancel')}</Button>
    </div>
  }

  const progress = phase.step === 'reading' ? phase.progress : null
  const percent = progress ? Math.floor((progress.done / Math.max(1, progress.total)) * 100) : null
  return <div className="erp-read-file mt-3">
    <FilePicker accept={ACCEPT} multiple={false} title={t('readAloud.fileTitle')}
      hint={t('readAloud.fileHint', { pdfSize: megabytes(TOOL_LIMITS.fileBytes), textSize: megabytes(READ_FILE_MAX_BYTES) })}
      compact={source !== null} loading={null} disabled={disabled || phase.step === 'reading'} onFiles={(files) => void choose(files)} />
    {phase.step === 'reading' ? <div role="status" className="mt-2">
      <p className="erp-tool-result__note mb-1">{progress?.stage === 'ocr' ? t('readAloud.fileOcr', { page: formatCount(progress.done + 1), total: formatCount(progress.total) }) : t('readAloud.fileReading')}</p>
      {percent !== null ? <ProgressBar now={percent} aria-label={t('readAloud.fileReading')} /> : null}
      <Button variant="outline-secondary" className="erp-read-notice__action mt-2" onClick={cancel}>{t('readAloud.fileCancel')}</Button>
    </div> : null}
    {phase.step === 'error' ? <ReadErrorNotice code={phase.code} detail={phase.detail} onPasteInstead={onPasteInstead} tone="alert" /> : null}
    {source && detail ? <p className="erp-tool-result__note mt-2" role="status">
      {t('readAloud.fileLoaded', { chars: formatCount(source.text.length), name: source.title })}
      {detail.encoding ? <span className="d-block">{t('readAloud.fileEncoding', { encoding: detail.encoding })}</span> : null}
      {detail.reviewed ? <span className="d-block">{t('readAloud.ocrReviewed')}</span> : null}
      {detail.skippedPages ? <span className="d-block">{t('readAloud.ocrSkipped', { max: formatCount(READ_OCR_MAX_PAGES), skipped: formatCount(detail.skippedPages) })}</span> : null}
    </p> : null}
  </div>
}
