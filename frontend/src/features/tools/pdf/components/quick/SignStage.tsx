import { useState } from 'react'
import { Icon } from '@/components/ui'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { ImageStamp } from '../../types/decorations.types'
import type { Point } from '../../utils/page-geometry'
import { PageCanvas } from './PageCanvas'
import { SignOverlay } from './SignOverlay'
import { StageHead } from './StageHead'

interface SignStageProps {
  item: QuickItem
  /** id trang → tâm các chữ ký trên trang đó (tỉ lệ trang). */
  spots: Readonly<Record<string, readonly Point[]>>
  stamp: Pick<ImageStamp, 'aspect' | 'widthRatio'> | null
  /** Ảnh chữ ký — chưa có thì chưa đặt được. */
  url?: string
  disabled: boolean
  onChange: (pageId: string, spots: Point[]) => void
  onClear: () => void
}

/** Vùng làm việc của "Chèn chữ ký": lật từng trang, bấm lên trang để đặt chữ ký. */
export function SignStage({ item, spots, stamp, url, disabled, onChange, onClear }: SignStageProps) {
  const [index, setIndex] = useState(0)
  const count = item.pages.length
  const page = item.pages[Math.min(index, count - 1)]
  const here = spots[page.id] ?? []
  const signed = item.pages.filter((ref) => (spots[ref.id]?.length ?? 0) > 0)
  const total = signed.reduce((sum, ref) => sum + spots[ref.id].length, 0)

  return (
    <section className="erp-page-stage" aria-label="Trang cần chèn chữ ký">
      <StageHead name={item.source.name} meta={total > 0 ? `${total} chữ ký trên ${signed.length} trang` : `${count} trang`}>
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
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={index >= count - 1} onClick={() => setIndex(count - 1)}>
            Tới trang cuối
          </button>
        </div>
        <div className="erp-page-stage__actions">
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, here.slice(0, -1))}>
            Bỏ chữ ký vừa đặt
          </button>
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, [])}>
            Bỏ hết trên trang này
          </button>
        </div>
      </div>

      <PageCanvas
        source={item.source}
        page={page}
        overlay={(size) => (stamp && url ? <SignOverlay size={size} spots={here} stamp={stamp} url={url} disabled={disabled} onChange={(next) => onChange(page.id, next)} /> : null)}
      />

      <p className="erp-page-stage__hint">
        <Icon name="info-circle" className="me-1" />
        {stamp && url
          ? 'Bấm lên trang để đặt chữ ký, kéo để dời, bấm vào chữ ký đã đặt để bỏ. Đặt được nhiều chỗ, trên nhiều trang.'
          : 'Vẽ chữ ký hoặc chọn ảnh chữ ký ở phần tuỳ chọn trước, rồi bấm lên trang để đặt.'}
      </p>
    </section>
  )
}
