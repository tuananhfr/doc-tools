import { useEffect, useId, useState } from 'react'
import { Button, Form, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { QuickItem } from '../../hooks/useQuickSources'
import { renderPdfPage } from '../../services/pdf-render'

/** Read-only source viewer; output previews stay in the existing result screen. */
export function PdfSourcePreview({ items, mixed = false }: { items: QuickItem[]; mixed?: boolean }) {
  const { t: s } = useTranslation('pdf', { keyPrefix: 'quickStudio.preview' })
  const { t: o } = useTranslation('pdf', { keyPrefix: 'quickStudio.ocr' })
  const id = useId()
  const [selection, setSelection] = useState({ id: '', page: 0 })
  const [zoom, setZoom] = useState(1)
  const [rendered, setRendered] = useState<{ key: string; url: string } | null>(null)
  const [failed, setFailed] = useState('')
  const item = items.find(item => item.source.id === selection.id) ?? items[0]
  const page = item?.source.id === selection.id ? Math.min(selection.page, item.pages.length - 1) : 0
  const source = item?.source
  const pageIndex = item?.pages[page]?.pageIndex ?? 0
  const key = source ? `${source.id}:${pageIndex}` : ''
  useEffect(() => {
    if (!source) return
    if (source.kind === 'image') {
      const url = URL.createObjectURL(new Blob([source.bytes], { type: source.mime }))
      setRendered({ key, url })
      return () => URL.revokeObjectURL(url)
    }
    if (source.kind !== 'pdf') return
    let active = true, url: string | null = null
    setRendered(null)
    setFailed('')
    void renderPdfPage(source, pageIndex, { scale: 1.5, maxArea: 2_500_000 }).then(async canvas => {
      try {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('preview')
        if (!active) return
        url = URL.createObjectURL(blob)
        setRendered({ key, url })
      } finally { canvas.width = 0; canvas.height = 0 }
    }).catch(() => { if (active) setFailed(key) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [source, pageIndex, key])
  const move = (delta: number) => { if (source) setSelection({ id: source.id, page: page + delta }) }
  const ready = rendered?.key === key && Boolean(key)
  return <div className="cn-pdfsource">
    {item ? <><label htmlFor={`${id}-file`} className="cn-pdfsource-label">{s('file')}</label><Form.Select id={`${id}-file`} value={source?.id} onChange={event => { setSelection({ id: event.target.value, page: 0 }); setZoom(1) }}>{items.map(item => <option key={item.source.id} value={item.source.id}>{item.source.name}</option>)}</Form.Select>
      <div className="cn-pdfsource-toolbar"><Button variant="link" aria-label={s('previous')} disabled={page <= 0} onClick={() => move(-1)}><Icon name="chevron-left" /></Button><span aria-live="polite">{page + 1} / {item.pages.length}</span><Button variant="link" aria-label={s('next')} disabled={page >= item.pages.length - 1} onClick={() => move(1)}><Icon name="chevron-right" /></Button><Button variant="link" aria-label={s('zoomOut')} disabled={zoom <= .75} onClick={() => setZoom(z => Math.max(.75, z - .25))}><Icon name="dash" /></Button><span>{Math.round(zoom * 100)}%</span><Button variant="link" aria-label={s('zoomIn')} disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))}><Icon name="plus" /></Button></div>
    </> : null}
    <div className="cn-pdfsource-viewport">{!item ? <div className="cn-flowstudio-empty"><Icon name={mixed ? 'upc-scan' : 'file-earmark-pdf'} /><strong>{mixed ? o('previewEmpty') : s('empty')}</strong><p>{s('emptyHint')}</p></div> : failed === key ? <p role="alert">{s('failed')}</p> : ready ? <img src={rendered!.url} alt={s('page', { page: page + 1 })} style={{ width: `${zoom * 100}%` }} /> : <p role="status"><Spinner size="sm" /> {s('loading')}</p>}</div>
  </div>
}
