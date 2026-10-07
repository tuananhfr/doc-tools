import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('pdf')
  const [index, setIndex] = useState(0)
  const count = item.pages.length
  const page = item.pages[Math.min(index, count - 1)]
  const here = spots[page.id] ?? []
  const signed = item.pages.filter((ref) => (spots[ref.id]?.length ?? 0) > 0)
  const total = signed.reduce((sum, ref) => sum + spots[ref.id].length, 0)

  return (
    <section className="erp-page-stage" aria-label={t('signStage.label')}>
      <StageHead name={item.source.name} meta={total > 0 ? t('signStage.meta', { count: total, pages: signed.length }) : t('stage.pageCount', { count })}>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
          {t('stage.removeFile')}
        </button>
      </StageHead>

      <div className="erp-page-stage__bar">
        <div className="erp-page-stage__nav" role="group" aria-label={t('stage.switchPage')}>
          <button type="button" className="btn erp-organize__button" aria-label={t('stage.prevPage')} disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <Icon name="chevron-left" />
          </button>
          <span className="erp-page-stage__page" aria-live="polite">
            {t('stage.pageOf', { page: index + 1, total: count })}
          </span>
          <button type="button" className="btn erp-organize__button" aria-label={t('stage.nextPage')} disabled={index >= count - 1} onClick={() => setIndex(index + 1)}>
            <Icon name="chevron-right" />
          </button>
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={index >= count - 1} onClick={() => setIndex(count - 1)}>
            {t('stage.lastPage')}
          </button>
        </div>
        <div className="erp-page-stage__actions">
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, here.slice(0, -1))}>
            {t('signStage.undo')}
          </button>
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, [])}>
            {t('signStage.clearPage')}
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
          ? t('signStage.hintReady')
          : t('signStage.hintWaiting')}
      </p>
    </section>
  )
}
