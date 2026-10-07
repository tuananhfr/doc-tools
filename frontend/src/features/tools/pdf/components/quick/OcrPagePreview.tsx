import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import { renderPreview } from '../../services/page-preview'

export function OcrPagePreview({ item, onReady }: { item: OcrReviewPage; onReady: (ready: boolean) => void }) {
  const { t } = useTranslation('pdf')
  const { t: o } = useTranslation('ocr')
  const [zoom, setZoom] = useState(1), [failed, setFailed] = useState(false)
  const output = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let live = true
    setFailed(false); onReady(false)
    void renderPreview(item.source, item.page, 1).then(canvas => {
      try {
        if (!live || !output.current) return
        output.current.width = canvas.width; output.current.height = canvas.height
        output.current.getContext('2d')!.drawImage(canvas, 0, 0)
        onReady(true)
      } finally { canvas.width = 1; canvas.height = 1 }
    }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [item.source, item.page, onReady])
  return <div className="cn-ocr-page-preview">
    <div><button type="button" className="btn btn-outline-secondary btn-sm" aria-label={o('zoomOut')} disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}>−</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" className="btn btn-outline-secondary btn-sm" aria-label={o('zoomIn')} disabled={zoom >= 4} onClick={() => setZoom(Math.min(4, zoom + 0.5))}>+</button></div>
    {failed ? <p role="alert">{t('ocrReview.previewFailed')}</p> : <div className="cn-ocr-page-preview__scroll" tabIndex={0} role="region" aria-label={t('ocrReview.original')}>
      <canvas ref={output} role="img" aria-label={t('ocrReview.original')} style={{ width: `${zoom * 100}%` }} />
    </div>}
  </div>
}
