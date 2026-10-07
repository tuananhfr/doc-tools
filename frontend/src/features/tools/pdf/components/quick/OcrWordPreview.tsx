import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OcrWordResult } from '../../types/ocr-result.types'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import { renderPreview, PDF_CSS_SCALE } from '../../services/page-preview'

export function OcrWordPreview({ item, word, onReady }: { item: OcrReviewPage; word: OcrWordResult; onReady: (ready: boolean) => void }) {
  const { t } = useTranslation('pdf')
  const output = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLCanvasElement | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    setImage(null)
    setFailed(false)
    renderPreview(item.source, item.page, (300 / 72) / PDF_CSS_SCALE).then(canvas => { if (live) setImage(canvas) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [item.source, item.page])
  useEffect(() => {
    const canvas = output.current
    onReady(false)
    if (!canvas || !image) return
    const box = word.previewBox
    const x = box.x * image.width
    const y = box.y * image.height
    const width = box.width * image.width
    const height = box.height * image.height
    const pad = Math.max(16, height)
    const left = Math.max(0, x - pad)
    const top = Math.max(0, y - pad)
    const cropWidth = Math.max(1, Math.min(image.width, x + width + pad) - left)
    const cropHeight = Math.max(1, Math.min(image.height, y + height + pad) - top)
    const scale = Math.min(3, 700 / cropWidth, 280 / cropHeight)
    canvas.width = Math.max(1, Math.ceil(cropWidth * scale))
    canvas.height = Math.max(1, Math.ceil(cropHeight * scale))
    const context = canvas.getContext('2d')!
    context.drawImage(image, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#b65a00'
    context.lineWidth = 2
    context.strokeRect((x - left) * scale, (y - top) * scale, width * scale, height * scale)
    onReady(true)
  }, [image, word, onReady])
  return <div className="cn-ocr-review__preview" aria-busy={!image && !failed}>
    {failed ? <p role="alert">{t('ocrReview.previewFailed')}</p> : <>
      {!image ? <p role="status">{t('ocrReview.previewLoading')}</p> : null}
      <canvas ref={output} hidden={!image} role="img" aria-label={t('ocrReview.original')} />
    </>}
  </div>
}
