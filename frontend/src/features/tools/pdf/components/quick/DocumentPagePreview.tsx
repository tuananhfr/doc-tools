import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ImageSheet, SourceFile } from '../../types/doc-tools.types'
import { PageCanvas } from './PageCanvas'

/** Keep all pages discoverable without allocating a high-resolution canvas for every page at once. */
export const DocumentPagePreview = memo(function DocumentPagePreview({ source, index, label, sheet, ratio = .707, onEdit }: { source: SourceFile; index: number; label: string; sheet?: ImageSheet; ratio?: number; onEdit?: () => void }) {
  const host = useRef<HTMLElement>(null), [visible, setVisible] = useState(false)
  const page = useMemo(() => ({ id: `${source.id}-${index}`, sourceId: source.id, pageIndex: index, rotation: 0 as const, sheet }), [source.id, index, sheet])
  useEffect(() => {
    if (!host.current || !('IntersectionObserver' in window)) { setVisible(true); return }
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: '600px' })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  return <figure ref={host} className="cn-document-page" aria-label={label}>
    <figcaption>{label}</figcaption>
    <div className="cn-document-page-canvas" style={{ aspectRatio: ratio }} role={onEdit ? 'button' : undefined} tabIndex={onEdit ? 0 : undefined} aria-label={onEdit ? label : undefined} onClick={onEdit} onKeyDown={event => { if (onEdit && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onEdit() } }}>
      {visible ? <PageCanvas source={source} page={page} /> : null}
    </div>
  </figure>
})
