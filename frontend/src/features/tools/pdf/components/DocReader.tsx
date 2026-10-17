import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { usePagePreview } from '../hooks/usePagePreview'
import type { SearchHit } from '../hooks/useTextSearch'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { PDF_CSS_SCALE } from '../services/page-preview'
import { stepZoom, type Box, type ZoomMode } from '../utils/preview-zoom'
import { DecorationOverlay, type StampView } from './DecorationOverlay'
import { MarkupLayer } from './MarkupShapes'
import { TextHitLayer } from './TextHitLayer'

interface Props {
  page: PageRef
  source: SourceFile
  position: number
  total: number
  stamp: StampView
  hits: SearchHit[]
  activeHitId: string | null
  onPage: (index: number) => void
}

export function DocReader({ page, source, position, total, stamp, hits, activeHitId, onPage }: Props) {
  const { t } = useTranslation('pdf')
  const stage = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<Box | null>(null)
  const [mode, setMode] = useState<ZoomMode>('width')
  const { host, size, zoom, status } = usePagePreview(source, page, mode, frame)
  const pageSize = useMemo(() => size ? { width: size.width / PDF_CSS_SCALE, height: size.height / PDF_CSS_SCALE } : null, [size])
  const pageHits = useMemo(() => hits.filter(hit => hit.pageId === page.id), [hits, page.id])
  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(() => setFrame({ width: Math.max(1, element.clientWidth - 24), height: Math.max(1, element.clientHeight - 24) }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => { stage.current?.scrollTo({ top: 0, left: 0 }) }, [page.id])
  return <div className="cn-pdf-reader">
    <div className="cn-pdf-reader__controls">
      <button type="button" className="btn btn-outline-secondary" disabled={position === 1} aria-label={t('stage.prevPage')} onClick={() => onPage(position - 2)}><Icon name="chevron-left" /></button>
      <label className="cn-pdf-reader__page">{t('reader.page')}<select className="form-select" aria-label={t('reader.page')} value={position - 1} onChange={event => onPage(Number(event.target.value))}>{Array.from({ length: total }, (_, index) => <option key={index} value={index}>{index + 1} / {total}</option>)}</select></label>
      <button type="button" className="btn btn-outline-secondary" disabled={position === total} aria-label={t('stage.nextPage')} onClick={() => onPage(position)}><Icon name="chevron-right" /></button>
      <button type="button" className="btn btn-outline-secondary" disabled={zoom === null} aria-label={t('preview.zoomOut')} onClick={() => setMode(stepZoom(zoom ?? 1, -1))}><Icon name="zoom-out" /></button>
      <output aria-live="polite">{Math.round((zoom ?? 1) * 100)}%</output>
      <button type="button" className="btn btn-outline-secondary" disabled={zoom === null} aria-label={t('preview.zoomIn')} onClick={() => setMode(stepZoom(zoom ?? 1, 1))}><Icon name="zoom-in" /></button>
      <button type="button" className="btn btn-outline-secondary" aria-pressed={mode === 'width'} onClick={() => setMode('width')}>{t('preview.fitWidth')}</button>
    </div>
    <div ref={stage} className="cn-pdf-reader__stage">
      {size && zoom !== null && pageSize ? <div className="erp-doc-preview__sheet" style={{ width: size.width * zoom, height: size.height * zoom }}>
        <div ref={host} className="erp-doc-preview__canvas" />
        <TextHitLayer hits={pageHits} activeId={activeHitId} size={pageSize} rotation={page.rotation} />
        <MarkupLayer markups={page.markups ?? []} size={pageSize} rotation={page.rotation} />
        <DecorationOverlay size={pageSize} pageId={page.id} index={position - 1} view={stamp} />
      </div> : null}
      {status !== 'ready' ? <p role="status">{t(status === 'error' ? 'stage.drawFailed' : 'stage.drawing')}</p> : null}
    </div>
  </div>
}
