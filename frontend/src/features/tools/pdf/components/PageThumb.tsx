import { useRef, type DragEvent, type MouseEvent } from 'react'
import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { InsertPosition, PageRef, SourceFile } from '../types/doc-tools.types'
import { usePageThumbnail } from '../hooks/usePageThumbnail'
import { describeOrigin } from '../utils/page-label'
import { DecorationOverlay, type StampView } from './DecorationOverlay'
import { MarkupLayer } from './MarkupShapes'
import { PageSheet } from './PageSheet'

interface PageThumbProps {
  page: PageRef
  position: number
  total: number
  source: SourceFile | undefined
  stamp: StampView
  hitCount: number
  selected: boolean
  dropSide: InsertPosition | null
  dragging: boolean
  onSelect: (event: MouseEvent) => void
  onPreview: () => void
  onShift: (delta: -1 | 1) => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

export function PageThumb({
  page,
  position,
  total,
  source,
  stamp,
  hitCount,
  selected,
  dropSide,
  dragging,
  onSelect,
  onPreview,
  onShift,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: PageThumbProps) {
  const { t } = useTranslation('pdf')
  const frame = useRef<HTMLDivElement>(null)
  const thumb = usePageThumbnail(frame, source, page)
  const origin = describeOrigin(source, page.pageIndex)

  const classes = [
    'erp-doc-page',
    selected ? 'is-selected' : '',
    dragging ? 'is-dragging' : '',
    dropSide ? `is-drop-${dropSide}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={classes}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="erp-doc-page__visual">
        <button
          type="button"
          className="erp-doc-page__select"
          aria-pressed={selected}
          aria-label={`${t('thumb.label', { position, origin })}${hitCount > 0 ? t('thumb.hits', { count: hitCount }) : ''}${selected ? t('thumb.selected') : ''}`}
          onClick={onSelect}
          onKeyDown={(event) => {
            // Space = xem to (như Quick Look); chọn trang bằng bàn phím vẫn còn Enter.
            if (event.key !== ' ') return
            event.preventDefault()
            onPreview()
          }}
        >
          <div ref={frame} className="erp-doc-page__frame">
            {thumb.status === 'ready' ? (
              <PageSheet
                url={thumb.url}
                base={thumb.base}
                rotation={page.rotation}
                overlay={(size) => (
                  <>
                    <MarkupLayer markups={page.markups} size={size} rotation={page.rotation} />
                    <DecorationOverlay size={size} pageId={page.id} index={position - 1} view={stamp} />
                  </>
                )}
              />
            ) : thumb.status === 'error' ? (
              <span className="erp-doc-page__placeholder">
                <Icon name="exclamation-triangle" className="me-1" />
                {t('thumb.drawFailed')}
              </span>
            ) : (
              <Spinner size="sm" className="erp-doc-page__spinner" aria-hidden />
            )}
          </div>
          <span className="erp-doc-page__check" aria-hidden>
            <Icon name={selected ? 'check-square-fill' : 'square'} />
          </span>
          {hitCount > 0 ? (
            <span className="erp-doc-page__hits" aria-hidden>
              <Icon name="search" className="me-1" />
              {hitCount}
            </span>
          ) : null}
          {page.rotation ? (
            <span className="erp-doc-page__rotation" aria-hidden>
              <Icon name="arrow-clockwise" className="me-1" />
              {page.rotation}°
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="erp-doc-page__zoom"
          aria-label={t('thumb.zoom', { position })}
          title={t('thumb.zoomHint')}
          onClick={onPreview}
        >
          <Icon name="zoom-in" />
        </button>
      </div>

      <div className="erp-doc-page__meta">
        <span className="erp-doc-page__no">{position}</span>
        <span className="erp-doc-page__origin" title={source?.name}>
          {origin}
        </span>
      </div>

      <div className="erp-doc-page__moves">
        <button
          type="button"
          className="erp-doc-page__move"
          aria-label={t('thumb.moveLeft', { position })}
          disabled={position === 1}
          onClick={() => onShift(-1)}
        >
          <Icon name="chevron-left" />
        </button>
        <span className="erp-doc-page__grip" aria-hidden title={t('thumb.grip')}>
          <Icon name="grip-horizontal" />
        </span>
        <button
          type="button"
          className="erp-doc-page__move"
          aria-label={t('thumb.moveRight', { position })}
          disabled={position === total}
          onClick={() => onShift(1)}
        >
          <Icon name="chevron-right" />
        </button>
      </div>
    </li>
  )
}
