import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('pdf')
  const [index, setIndex] = useState(0)
  const count = item.pages.length
  const page = item.pages[Math.min(index, count - 1)]
  const here = boxes[page.id] ?? []
  const marked = item.pages.filter((ref) => (boxes[ref.id]?.length ?? 0) > 0)
  const total = marked.reduce((sum, ref) => sum + boxes[ref.id].length, 0)

  return (
    <section className="erp-page-stage" aria-label={t('redactStage.label')}>
      <StageHead name={item.source.name} meta={total > 0 ? t('redactStage.meta', { count: total, pages: marked.length }) : t('stage.pageCount', { count })}>
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
        </div>
        <div className="erp-page-stage__actions">
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, here.slice(0, -1))}>
            {t('redactStage.undo')}
          </button>
          <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || here.length === 0} onClick={() => onChange(page.id, [])}>
            {t('redactStage.clearPage')}
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
        {t('redactStage.hint')}
      </p>
    </section>
  )
}
