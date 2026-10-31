import { useEffect, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslation } from 'react-i18next'
import { newId } from '@/utils/id'
import type { PdfSource } from '../../types/doc-tools.types'
import { PageCanvas } from './PageCanvas'
import { releaseDocument } from '../../services/pdf-render'
import { DocumentPagePreview } from './DocumentPagePreview'

export function TextPdfPreview({ blob, name, onEdit, allPages = false }: { blob: Blob; name: string; onEdit?: () => void; allPages?: boolean }) {
  const { t } = useTranslation('pdf', { keyPrefix: 'documentScan' })
  const [source, setSource] = useState<PdfSource | null>(null), [index, setIndex] = useState(0), [failed, setFailed] = useState(false)
  const [ratios, setRatios] = useState<number[]>([])
  useEffect(() => {
    let live = true, id: string | undefined
    setSource(null); setIndex(0); setFailed(false)
    void blob.arrayBuffer().then(async buffer => {
      const bytes = new Uint8Array(buffer), doc = await PDFDocument.load(bytes)
      if (!live) return
      id = newId(); setRatios(doc.getPages().map(page => page.getRotation().angle % 180 ? page.getHeight() / page.getWidth() : page.getWidth() / page.getHeight())); setSource({ id, name, kind: 'pdf', mime: 'application/pdf', bytes, size: bytes.byteLength, pageCount: doc.getPageCount() })
    }).catch(() => { if (live) setFailed(true) })
    return () => { live = false; if (id) releaseDocument(id) }
  }, [blob, name])
  if (!source) return <p role="status">{t(failed ? 'textPreviewFailed' : 'textPreviewLoading')}</p>
  if (allPages) return <div className="cn-textpdf-preview cn-document-pages">{ratios.map((ratio, index) => <DocumentPagePreview key={`${source.id}-${index}`} source={source} index={index} ratio={ratio} label={t('textPage', { page: index + 1, total: source.pageCount })} onEdit={onEdit} />)}</div>
  return <div className="cn-textpdf-preview"><div className="cn-textpdf-expand" role={onEdit ? 'button' : undefined} tabIndex={onEdit ? 0 : undefined} aria-label={onEdit ? t('editText') : undefined} title={onEdit ? t('editText') : undefined} onClick={onEdit} onKeyDown={event => { if (onEdit && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onEdit() } }}><PageCanvas source={source} page={{ id: `${source.id}-${index}`, sourceId: source.id, pageIndex: index, rotation: 0 }} /></div><div className="cn-imagespdf-pagination"><button type="button" className="btn btn-link" disabled={index === 0} aria-label={t('textPrevious')} onClick={() => setIndex(index - 1)}>‹</button><span>{t('textPage', { page: index + 1, total: source.pageCount })}</span><button type="button" className="btn btn-link" disabled={index + 1 >= source.pageCount} aria-label={t('textNext')} onClick={() => setIndex(index + 1)}>›</button></div></div>
}
