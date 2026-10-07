import { useRef } from 'react'
import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { OrganizePages } from '../../hooks/useOrganizePages'
import { usePageThumbnail } from '../../hooks/usePageThumbnail'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { PageRef, SourceFile } from '../../types/doc-tools.types'
import { PageSheet } from '../PageSheet'
import { StageHead } from './StageHead'

interface OrganizeStageProps {
  items: QuickItem[]
  organize: OrganizePages
  disabled: boolean
  onClear: () => void
}

interface TileProps {
  page: PageRef
  position: number
  total: number
  source: SourceFile | undefined
  disabled: boolean
  organize: OrganizePages
}

const noOverlay = () => null

function OrganizeTile({ page, position, total, source, disabled, organize }: TileProps) {
  const { t } = useTranslation('pdf')
  const frame = useRef<HTMLDivElement>(null)
  const thumb = usePageThumbnail(frame, source, page)

  return (
    <li className="erp-organize__tile">
      <div ref={frame} className="erp-organize__frame">
        {thumb.status === 'ready' ? (
          <PageSheet url={thumb.url} base={thumb.base} rotation={page.rotation} overlay={noOverlay} />
        ) : thumb.status === 'error' ? (
          <Icon name="exclamation-triangle" />
        ) : (
          <Spinner size="sm" aria-hidden />
        )}
      </div>
      <p className="erp-organize__label">
        <span className="erp-organize__no">{position}</span>
        {/* Số trang trong tệp gốc: dời đi rồi vẫn biết trang này vốn ở đâu. */}
        <span className="erp-organize__origin">{t('organizeStage.origin', { page: page.pageIndex + 1 })}</span>
      </p>
      <div className="erp-organize__actions">
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={t('organizeStage.moveBackLabel', { position })}
          title={t('organizeStage.moveBack')}
          disabled={disabled || position === 1}
          onClick={() => organize.shift(page.id, -1)}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={t('organizeStage.moveForwardLabel', { position })}
          title={t('organizeStage.moveForward')}
          disabled={disabled || position === total}
          onClick={() => organize.shift(page.id, 1)}
        >
          <Icon name="chevron-right" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={t('organizeStage.rotateLabel', { position })}
          title={t('organizeStage.rotate')}
          disabled={disabled}
          onClick={() => organize.rotate(page.id)}
        >
          <Icon name="arrow-clockwise" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button erp-organize__button--remove"
          aria-label={t('organizeStage.removeLabel', { position })}
          title={t('organizeStage.remove')}
          disabled={disabled}
          onClick={() => organize.remove(page.id)}
        >
          <Icon name="trash" />
        </button>
      </div>
    </li>
  )
}

/** Lưới trang của "Sắp xếp PDF": dời, xoay, bỏ từng trang bằng nút — dùng được trên điện thoại và bằng bàn phím. */
export function OrganizeStage({ items, organize, disabled, onClear }: OrganizeStageProps) {
  const { t } = useTranslation('pdf')
  const sources = Object.fromEntries(items.map((item) => [item.source.id, item.source]))
  const original = items.reduce((sum, item) => sum + item.pages.length, 0)
  const removed = original - organize.pages.length
  const name = items.length === 1 ? items[0].source.name : t('organizeStage.filesName', { count: items.length })
  const count = organize.pages.length

  return (
    <section className="erp-page-stage" aria-label={t('organizeStage.label')}>
      <StageHead name={name} meta={removed > 0 ? t('organizeStage.metaRemoved', { count, removed }) : t('organizeStage.meta', { count })}>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || organize.untouched} onClick={organize.reset}>
          {t('organizeStage.reset')}
        </button>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
          {items.length > 1 ? t('stage.removeAll') : t('stage.removeFile')}
        </button>
      </StageHead>

      {organize.pages.length > 0 ? (
        <ol className="erp-organize">
          {organize.pages.map((page, index) => (
            <OrganizeTile
              key={page.id}
              page={page}
              position={index + 1}
              total={organize.pages.length}
              source={sources[page.sourceId]}
              disabled={disabled}
              organize={organize}
            />
          ))}
        </ol>
      ) : (
        <p className="erp-page-stage__empty">{t('organizeStage.empty')}</p>
      )}
    </section>
  )
}
