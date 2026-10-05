import { useRef } from 'react'
import { Spinner } from 'react-bootstrap'
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
        <span className="erp-organize__origin">gốc: trang {page.pageIndex + 1}</span>
      </p>
      <div className="erp-organize__actions">
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={`Dời trang ${position} lên trước`}
          title="Dời lên trước"
          disabled={disabled || position === 1}
          onClick={() => organize.shift(page.id, -1)}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={`Dời trang ${position} ra sau`}
          title="Dời ra sau"
          disabled={disabled || position === total}
          onClick={() => organize.shift(page.id, 1)}
        >
          <Icon name="chevron-right" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button"
          aria-label={`Xoay trang ${position} sang phải`}
          title="Xoay 90°"
          disabled={disabled}
          onClick={() => organize.rotate(page.id)}
        >
          <Icon name="arrow-clockwise" />
        </button>
        <button
          type="button"
          className="btn erp-organize__button erp-organize__button--remove"
          aria-label={`Bỏ trang ${position}`}
          title="Bỏ trang"
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
  const sources = Object.fromEntries(items.map((item) => [item.source.id, item.source]))
  const original = items.reduce((sum, item) => sum + item.pages.length, 0)
  const removed = original - organize.pages.length
  const name = items.length === 1 ? items[0].source.name : `${items.length} tệp PDF`

  return (
    <section className="erp-page-stage" aria-label="Các trang của tệp">
      <StageHead name={name} meta={`${organize.pages.length} trang${removed > 0 ? ` · đã bỏ ${removed}` : ''}`}>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled || organize.untouched} onClick={organize.reset}>
          Hoàn lại
        </button>
        <button type="button" className="btn btn-link btn-sm erp-flow-files__clear" disabled={disabled} onClick={onClear}>
          {items.length > 1 ? 'Bỏ tất cả' : 'Bỏ tệp'}
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
        <p className="erp-page-stage__empty">Đã bỏ hết trang. Bấm "Hoàn lại" để lấy lại các trang của tệp.</p>
      )}
    </section>
  )
}
