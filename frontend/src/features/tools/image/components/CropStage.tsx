import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { createCanvas, decodeImage, releaseCanvas, rotateContext } from '../services/image-codec'
import type { ImageItem, Rect } from '../types/image.types'
import { adjustFilter } from '../utils/adjust'
import { rotatedSize } from '../utils/crop-rect'
import { ASPECT_RATIO, type CropState } from '../utils/crop-state'
import { fitWithin, sizeLabel } from '../utils/image-format'
import { CropBox } from './CropBox'

interface CropStageProps {
  item: ImageItem
  state: CropState
  /** Tỉ lệ khung phải giữ (rộng / cao), thay cho `state.aspect` — ảnh thẻ có tỉ lệ ngoài bộ có sẵn. */
  aspect?: number
  disabled: boolean
  onRectChange: (rect: Rect) => void
}

/** Cạnh dài của bản xem trước: đủ nét trên màn 1440, mà xoay / kéo khung không phải vẽ lại ảnh 12 MP. */
const PREVIEW_EDGE = 1600

type Preview = { id: string; source: HTMLCanvasElement } | { id: string; failed: true }

/**
 * Vùng làm việc của "Cắt & chỉnh ảnh": bản xem trước thu nhỏ + khung cắt. Sáng /
 * tương phản xem trước bằng `filter` của CSS; ảnh thật chỉ được dựng lúc lưu.
 */
export function CropStage({ item, state, aspect, disabled, onRectChange }: CropStageProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const bounds = rotatedSize(item, state.rotation)
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
    const size = rotatedSize(source, state.rotation)
    // Gán lại kích thước cũng xoá canvas và đặt lại phép biến đổi.
    target.width = size.width
    target.height = size.height
    const context = target.getContext('2d')
    if (!context) return
    rotateContext(context, source, state.rotation)
    context.drawImage(source, 0, 0)
  }, [source, state.rotation])

  return (
    <section className="erp-image-stage" aria-label="Ảnh đang chỉnh">
      <p className="erp-image-stage__caption">
        <span className="erp-image-stage__name" title={item.name}>
          {item.name}
        </span>
        <span className="erp-image-stage__meta">{sizeLabel(item)}</span>
      </p>

      <div className="erp-image-stage__frame" style={{ '--erp-image-ratio': bounds.width / bounds.height } as CSSProperties}>
        {current && 'failed' in current ? (
          <p className="erp-image-stage__status" role="alert">
            <Icon name="exclamation-triangle" />
            Không vẽ được bản xem trước của ảnh này.
          </p>
        ) : (
          <>
            <canvas ref={canvas} className="erp-image-stage__canvas" style={{ filter: adjustFilter(state) }} aria-hidden="true" />
            {source ? (
              <CropBox bounds={bounds} rect={state.rect} aspect={aspect ?? ASPECT_RATIO[state.aspect]} disabled={disabled} onChange={onRectChange} />
            ) : (
              <p className="erp-image-stage__status" role="status">
                <Spinner as="span" size="sm" />
                Đang mở ảnh…
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
