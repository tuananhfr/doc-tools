import { useEffect, useState } from 'react'
import type { OcrReviewPage } from '../../hooks/useOcrReview'
import type { OcrCell } from '../../types/ocr-layout.types'
import type { OcrWordResult } from '../../types/ocr-result.types'
import { basePageSize } from '../../services/page-size'
import { baseToVisual, normalizeRotation, visualSize } from '../../utils/page-geometry'
import { OcrWordPreview } from './OcrWordPreview'

const ignoreReady = () => undefined
export function OcrCellPreview({ item, cell }: { item: OcrReviewPage; cell: OcrCell }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    let live = true
    setSize(null)
    void basePageSize(item.source, item.page).then(value => { if (live) setSize(value) }, () => undefined)
    return () => { live = false }
  }, [item.source, item.page])
  if (!size) return null
  const turn = normalizeRotation(item.page.rotation), visual = visualSize(size, turn)
  const points = cell.bbox.map(point => baseToVisual(point, size, turn))
  const xs = points.map(point => point.x / visual.width), ys = points.map(point => point.y / visual.height)
  const word: Pick<OcrWordResult, 'previewBox'> = { previewBox: { x: Math.max(0, Math.min(...xs)), y: Math.max(0, Math.min(...ys)), width: Math.min(1, Math.max(...xs)) - Math.max(0, Math.min(...xs)), height: Math.min(1, Math.max(...ys)) - Math.max(0, Math.min(...ys)) } }
  return <OcrWordPreview item={item} word={word} dpi={150} onReady={ignoreReady} />
}
