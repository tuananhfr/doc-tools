import { Fragment, type ReactNode, type RefObject } from 'react'
import { Form, Spinner } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { FindReplace } from '../hooks/useFindReplace'
import { isReplaceable } from '../hooks/useFindReplace'
import type { SearchHit, TextSearch } from '../hooks/useTextSearch'
import { MAX_HITS } from '../hooks/useTextSearch'
import { ReplaceBar } from './ReplaceBar'

interface SearchPanelProps {
  search: TextSearch
  replace: FindReplace
  inputRef: RefObject<HTMLInputElement | null>
  onOpenHit: (hit: SearchHit) => void
  onStep: (delta: 1 | -1) => void
  /** Khối OCR — chỉ hiện khi chưa tìm hoặc có trang không có lớp chữ. */
  ocrSection?: ReactNode
  ocrRunning?: boolean
}

function StatusLine({ search }: { search: TextSearch }) {
  const { t } = useTranslation('pdf')
  if (!search.active) return <p className="erp-doc-search__status">{t('search.idle')}</p>
  if (search.searching) {
    return (
      <p className="erp-doc-search__status" role="status">
        <Spinner size="sm" as="span" className="me-2" />
        {t('search.reading', { done: search.progress.done, total: search.progress.total })}
      </p>
    )
  }
  const pageCount = new Set(search.hits.map((hit) => hit.pageId)).size
  return (
    <p className="erp-doc-search__status" role="status">
      {search.hits.length === 0 ? (
        t('search.notFound')
      ) : (
        // Bọc span: dòng trạng thái là flex, khoảng trắng đứng đầu một mẩu chữ rời bị nuốt mất.
        <span>
          <Trans
            ns="pdf"
            i18nKey={search.truncated ? 'search.summaryTruncated' : 'search.summary'}
            count={search.hits.length}
            values={{ pages: pageCount, max: MAX_HITS }}
            components={{ strong: <strong /> }}
          />
        </span>
      )}
    </p>
  )
}

/** Tab Tìm ở cột phải: ô tìm + tuỳ chọn + danh sách kết quả theo trang. Bấm một kết quả mở trang đó cỡ lớn. */
function HitFlags({ hit, replace }: { hit: SearchHit; replace: FindReplace }) {
  const { t } = useTranslation('pdf')
  if (replace.replaced.has(hit.id)) {
    return (
      <span className="erp-doc-search__flag is-done">
        <Icon name="check2" /> {t('search.replaced')}
      </span>
    )
  }
  if (!isReplaceable(hit)) {
    return (
      <span className="erp-doc-search__flag" title={t('search.twoLinesHint')}>
        <Icon name="slash-circle" /> {t('search.twoLines')}
      </span>
    )
  }
  if (replace.tooLong.has(hit.id)) {
    return (
      <span className="erp-doc-search__flag is-warn" title={t('search.tooLongHint')}>
        <Icon name="exclamation-triangle" /> {t('search.tooLong')}
      </span>
    )
  }
  return null
}

export function SearchPanel({ search, replace, inputRef, onOpenHit, onStep, ocrSection, ocrRunning = false }: SearchPanelProps) {
  const { t } = useTranslation('pdf')
  const groups: { pageNumber: number; hits: SearchHit[] }[] = []
  for (const hit of search.hits) {
    const last = groups[groups.length - 1]
    if (last?.pageNumber === hit.pageNumber) last.hits.push(hit)
    else groups.push({ pageNumber: hit.pageNumber, hits: [hit] })
  }

  return (
    <div className="erp-doc-search">
      <div className="erp-doc-search__box">
        <Icon name="search" className="erp-doc-search__icon" />
        <Form.Control
          ref={inputRef}
          type="search"
          value={search.query}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          onChange={(event) => search.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || search.hits.length === 0) return
            event.preventDefault()
            onStep(event.shiftKey ? -1 : 1)
          }}
        />
      </div>

      <div className="erp-doc-search__options">
        <Form.Check
          id="doc-search-accents"
          type="checkbox"
          label={t('search.accents')}
          checked={!search.options.ignoreAccents}
          onChange={(event) => search.setOptions({ ...search.options, ignoreAccents: !event.target.checked })}
        />
        <Form.Check
          id="doc-search-case"
          type="checkbox"
          label={t('search.matchCase')}
          checked={search.options.matchCase}
          onChange={(event) => search.setOptions({ ...search.options, matchCase: event.target.checked })}
        />
        <Form.Check
          id="doc-search-replace"
          type="switch"
          label={t('search.replace')}
          checked={replace.open}
          onChange={(event) => replace.setOpen(event.target.checked)}
        />
      </div>
      {replace.open ? <ReplaceBar replace={replace} /> : null}

      <StatusLine search={search} />
      {search.active && search.textless > 0 ? (
        <p className="erp-doc-search__note">
          <Icon name="info-circle" className="me-1" />
          {t('search.textless', { count: search.textless })}
        </p>
      ) : null}
      {ocrRunning || !search.active || search.textless > 0 ? ocrSection : null}

      {search.hits.length > 0 ? (
        <>
          <div className="erp-doc-search__nav">
            <button type="button" className="erp-doc-tool" aria-label={t('preview.prevHit')} title={t('search.prevHint')} onClick={() => onStep(-1)}>
              <Icon name="chevron-up" />
            </button>
            <span className="erp-doc-search__count">
              {search.activeIndex >= 0 ? search.activeIndex + 1 : '–'}/{search.hits.length}
            </span>
            <button type="button" className="erp-doc-tool" aria-label={t('preview.nextHit')} title={t('search.nextHint')} onClick={() => onStep(1)}>
              <Icon name="chevron-down" />
            </button>
          </div>
          <ol className="erp-doc-search__list">
            {groups.map((group) => (
              <Fragment key={group.pageNumber}>
                <li className="erp-doc-search__page">{t('search.page', { page: group.pageNumber })}</li>
                {group.hits.map((hit, index) => (
                  <li key={hit.id} className="erp-doc-search__row">
                    {replace.open ? (
                      <Form.Check
                        id={`doc-hit-${hit.id}`}
                        className="erp-doc-search__pick"
                        aria-label={t('search.pick', { index: index + 1, page: hit.pageNumber })}
                        checked={replace.selected.has(hit.id)}
                        disabled={!replace.selectable(hit)}
                        onChange={(event) => replace.toggle(hit.id, event.target.checked)}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={`erp-doc-search__hit${hit.id === search.activeHit?.id ? ' is-active' : ''}`}
                      aria-current={hit.id === search.activeHit?.id ? 'true' : undefined}
                      onClick={() => onOpenHit(hit)}
                    >
                      {hit.snippet.before}
                      <mark>{hit.snippet.match}</mark>
                      {hit.snippet.after}
                      {replace.open ? <HitFlags hit={hit} replace={replace} /> : null}
                    </button>
                  </li>
                ))}
              </Fragment>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  )
}
