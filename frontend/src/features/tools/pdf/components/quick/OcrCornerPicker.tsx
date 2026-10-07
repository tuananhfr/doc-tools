import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { Quad } from '../../types/text-layer.types'
import type { Point } from '../../utils/page-geometry'
import { validPaperCorners } from '../../utils/ocr-perspective'
import { renderPreview } from '../../services/page-preview'

export function OcrCornerPicker({ item, onChange, onInvalid }: { item?: QuickItem; onChange: (corners?: Quad) => void; onInvalid: (invalid: boolean) => void }) {
  const { t } = useTranslation('ocr')
  const canvas = useRef<HTMLCanvasElement>(null), [points, setPoints] = useState<Point[]>([]), [ready, setReady] = useState(false)
  const page = item?.pages[0]
  useEffect(() => {
    let live = true
    setReady(false); setPoints([]); onChange(undefined); onInvalid(false)
    if (!item || !page) return
    void renderPreview(item.source, page, 1).then(source => {
      try {
        if (!live || !canvas.current) return
        canvas.current.width = source.width; canvas.current.height = source.height
        canvas.current.getContext('2d')!.drawImage(source, 0, 0); setReady(true)
      } finally { source.width = 1; source.height = 1 }
    }).catch(() => undefined)
    return () => { live = false }
    // The callbacks update options; source identity alone resets this selection.
  }, [item, page])
  function choose(point: Point) {
    if (!ready) return
    const next = [...(points.length === 4 ? [] : points), point]
    setPoints(next)
    const invalid = next.length !== 4 || !validPaperCorners(next as Quad, 1, 1)
    onInvalid(invalid); onChange(invalid ? undefined : next as Quad)
  }
  return <details className="cn-ocr-corners"><summary>{t('corners')}</summary>
    <p className="erp-flow-field__hint">{t('cornersHint')}</p>
    <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!ready} onClick={() => { const next: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]; setPoints(next); onChange(next); onInvalid(false) }}>{t('cornersStart')}</button>
    {!item ? <p>{t('cornersSelectFile')}</p> : <div className="cn-ocr-corners__image" onClick={event => {
      const box = event.currentTarget.getBoundingClientRect()
      choose({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
    }}>
      <canvas ref={canvas} role="img" aria-label={t('corners')} />
      {points.map((point, index) => <span key={index} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}>{index + 1}</span>)}
    </div>}
    {points.length ? <>
      <p aria-live="polite">{t('cornersProgress', { selected: points.length })}</p>
      {points.map((point, index) => <div className="cn-ocr-corners__coordinates" key={index}>
        {(['x', 'y'] as const).map(axis => <label key={axis}>{t('cornerCoordinate', { index: index + 1, axis })}<input type="number" min="0" max="100" step="0.1" value={Math.round(point[axis] * 1000) / 10} onChange={event => {
          const next = points.map((current, i) => i === index ? { ...current, [axis]: Number(event.target.value) / 100 } : current)
          setPoints(next); const invalid = next.length !== 4 || !validPaperCorners(next as Quad, 1, 1)
          onInvalid(invalid); onChange(invalid ? undefined : next as Quad)
        }} /></label>)}
      </div>)}
      {points.length === 4 && !validPaperCorners(points as Quad, 1, 1) ? <p role="alert">{t('invalidCorners')}</p> : null}
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setPoints([]); onChange(undefined); onInvalid(false) }}>{t('cornersReset')}</button>
    </> : null}
  </details>
}
