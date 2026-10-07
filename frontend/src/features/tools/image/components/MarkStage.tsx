import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { createCanvas, decodeImage, releaseCanvas } from '../services/image-codec'
import { paintMarks } from '../services/mark-render'
import type { ImageItem, Rect } from '../types/image.types'
import type { MarkState } from '../types/mark.types'
import { fitWithin, sizeLabel } from '../utils/image-format'
import { MarkOverlay } from './MarkOverlay'

interface MarkStageProps {
  item: ImageItem
  state: MarkState
  disabled: boolean
  onBoxesChange: (boxes: Rect[]) => void
}

/** Cạnh dài của bản xem trước: đủ nét trên màn 1440, mà mỗi phím gõ không phải vẽ lại ảnh 12 MP. */
const PREVIEW_EDGE = 1600

type Preview = { id: string; source: HTMLCanvasElement } | { id: string; failed: true }

/**
 * Vùng làm việc của "Che & đóng dấu ảnh". Bản xem trước được vẽ bằng CHÍNH hàm
 * dựng ảnh ra (`paintMarks`) trên ảnh thu nhỏ — thứ thấy ở đây là thứ nằm trong tệp.
 */
export function MarkStage({ item, state, disabled, onBoxesChange }: MarkStageProps) {
  const { t } = useTranslation('image')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const current = preview?.id === item.id ? preview : null
  const source = current && 'source' in current ? current.source : null

  useEffect(() => {
    let alive = true
    let made: HTMLCanvasElement | null = null
    decodeImage(item.file)
      .then((bitmap) => {
        try {
          const small = createCanvas(fitWithin(bitmap, PREVIEW_EDGE))
          small.context.drawImage(bitmap, 0, 0, small.canvas.width, small.canvas.height)
          made = small.canvas
          if (alive) setPreview({ id: item.id, source: small.canvas })
          else releaseCanvas(small.canvas)
        } finally {
          bitmap.close()
        }
      })
      .catch(() => {
        if (alive) setPreview({ id: item.id, failed: true })
      })
    return () => {
      alive = false
      if (made) releaseCanvas(made)
    }
  }, [item])

  useEffect(() => {
    const target = canvas.current
    if (!target || !source) return
    // Gán lại kích thước cũng xoá canvas.
    target.width = source.width
    target.height = source.height
    const context = target.getContext('2d')
    if (!context) return
    context.drawImage(source, 0, 0)
    paintMarks(context, source, item, state)
  }, [source, item, state])

  return (
    <section className="erp-image-stage" aria-label={t('mark.stageLabel')}>
      <p className="erp-image-stage__caption">
        <span className="erp-image-stage__name" title={item.name}>
          {item.name}
        </span>
        <span className="erp-image-stage__meta">
          {sizeLabel(item)} · {t('mark.boxCount', { count: state.boxes.length })}
        </span>
      </p>

      <div className="erp-image-stage__frame" style={{ '--erp-image-ratio': item.width / item.height } as CSSProperties}>
        {current && 'failed' in current ? (
          <p className="erp-image-stage__status" role="alert">
            <Icon name="exclamation-triangle" />
            {t('shared.previewFailed')}
          </p>
        ) : (
          <>
            <canvas ref={canvas} className="erp-image-stage__canvas" aria-hidden="true" />
            {source ? (
              <MarkOverlay size={item} boxes={state.boxes} disabled={disabled} onChange={onBoxesChange} />
            ) : (
              <p className="erp-image-stage__status" role="status">
                <Spinner as="span" size="sm" />
                {t('shared.opening')}
              </p>
            )}
          </>
        )}
      </div>
      <p className="erp-flow-field__hint mb-0">{t('mark.stageHint')}</p>
    </section>
  )
}
