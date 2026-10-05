import { useState } from 'react'
import { Icon } from '@/components/ui'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { Rect } from '../../types/markup.types'
import { PageCanvas } from './PageCanvas'
import { RedactOverlay } from './RedactOverlay'
import { StageHead } from './StageHead'

interface RedactStageProps {
  item: QuickItem
  /** id trang → khung che trên trang đó. */
  boxes: Readonly<Record<string, Rect[]>>
  disabled: boolean
  onChange: (pageId: string, boxes: Rect[]) => void
  onClear: () => void
}

/** Vùng làm việc của "Che thông tin PDF": lật từng trang, kéo khoanh vùng cần che. */
export function RedactStage({ item, boxes, disabled, onChange, onClear }: RedactStageProps) {
  const [index, setIndex] = useState(0)
  const count = item.pages.length
  const page = item.pages[Math.min(index, count - 1)]
  const here = boxes[page.id] ?? []
  const marked = item.pages.filter((ref) => (boxes[ref.id]?.length ?? 0) > 0)
  const total = marked.reduce((sum, ref) => sum + boxes[ref.id].length, 0)

  return (
    <section className="erp-page-stage" aria-label="Trang cần che">
      <StageHead name={item.source.name} meta={total > 0 ? `${total} khung trên ${marked.length} trang` : `${count} trang`}>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
          Bỏ tệp
        </button>
      </StageHead>

      <div className="erp-page-stage__bar">
        <div className="erp-page-stage__nav" role="group" aria-label="Chuyển trang">
          <button type="button" className="btn erp-organize__button" aria-label="Trang trước" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <Icon name="chevron-left" />
          </button>
          <span className="erp-page-stage__page" aria-live="polite">
            Trang {index + 1}/{count}
          </span>
          <button type="button" className="btn erp-organize__button" aria-label="Trang sau" disabled={index >= count - 1} onClick={() => setIndex(index + 1)}>
            <Icon name="chevron-right" />
          </button>
        </div>
        <div className="erp-page-stage__actions">
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, here.slice(0, -1))}>
            Bỏ khung vừa vẽ
          </button>
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, [])}>
            Bỏ hết khung trang này
          </button>
        </div>
      </div>

      <PageCanvas
        source={item.source}
        page={page}
        overlay={(size) => <RedactOverlay size={size} boxes={here} disabled={disabled} onChange={(next) => onChange(page.id, next)} />}
      />

      <p className="erp-page-stage__hint">
        <Icon name="info-circle" className="me-1" />
        Kéo trên trang để khoanh vùng cần che; bấm vào khung đã vẽ để bỏ. Khoanh rộng hơn chữ một chút — chữ chạm mép khung cũng bị xoá cả mảnh.
      </p>
    </section>
  )
}
