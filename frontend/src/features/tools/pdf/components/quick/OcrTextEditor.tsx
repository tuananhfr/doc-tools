import { useEffect, useId, useRef, useState, type ClipboardEvent } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, type FlowResult } from '@/features/tools/hub'
import type { ImageSheet } from '../../types/doc-tools.types'
import { editOcrTextPdf } from '../../services/ocr-text-edit'
import { previewOcrTextLayout } from '../../services/ocr-text-pdf'
import { editedOcrSources, type OcrPaperLayout } from '../../utils/ocr-text-layout'

const PX = 96 / 72

function EditablePaper({ text, label, layout, zoom, disabled, onChange }: { text: string; label: string; layout: OcrPaperLayout; zoom: number; disabled: boolean; onChange: (text: string) => void }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => { if (element.current) element.current.textContent = text }, [text])
  const changed = () => { if (element.current) onChange(element.current.innerText.replace(/\u00a0/g, ' ')) }
  const paste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain'), selection = window.getSelection(), node = document.createTextNode(text)
    if (selection?.rangeCount && element.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0); range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true)
      selection.removeAllRanges(); selection.addRange(range)
    } else element.current?.append(node)
    changed()
  }
  return <div ref={element} className="cn-ocr-edit-paper" role="textbox" aria-label={label} aria-multiline="true" tabIndex={0}
    contentEditable={disabled ? false : 'plaintext-only'} suppressContentEditableWarning spellCheck
    style={{ width: layout.width * PX, minHeight: layout.height * PX, padding: layout.margin * PX, fontSize: layout.fontSize * PX, lineHeight: `${layout.lineHeight * PX}px`, zoom }}
    onInput={changed} onPaste={paste} onDrop={event => event.preventDefault()} />
}

export function OcrTextEditor({ result, sheet, onApply, onClose, onBusy }: { result: FlowResult; sheet: ImageSheet; onApply: (result: FlowResult) => void; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const { t } = useTranslation('pdf', { keyPrefix: 'documentScan' }), { t: pdf } = useTranslation('pdf'), { t: ocr } = useTranslation('ocr')
  const id = useId(), controller = useRef<AbortController | null>(null), gallery = useRef<HTMLDivElement>(null)
  const [sources] = useState(() => [...(result.textPages ?? [result.text ?? ''])])
  const [layout, setLayout] = useState<OcrPaperLayout | null>(null), [zoom, setZoom] = useState(1)
  const [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(false)
  const dirty = revision > 0
  const values = useRef<string[]>([])
  useEffect(() => {
    const abort = new AbortController()
    void previewOcrTextLayout(sources, sheet, abort.signal).then(layout => {
      if (abort.signal.aborted) return
      values.current = layout.pages.map(page => page.lines.join('\n')); setLayout(layout)
      setZoom(Math.max(.3, Math.min(1, ((gallery.current?.clientWidth ?? window.innerWidth) - 32) / (layout.width * PX))))
    }).catch(() => { if (!abort.signal.aborted) setError(true) })
    return () => { abort.abort(); controller.current?.abort(); onBusy(false) }
  }, [sources, sheet, onBusy])
  const close = () => { controller.current?.abort(); onBusy(false); onClose() }
  const apply = async (download: boolean) => {
    if (!layout) return
    const abort = new AbortController(); controller.current = abort
    setBusy(true); onBusy(true); setError(false)
    try {
      const updated = dirty ? await editOcrTextPdf(result, editedOcrSources(layout, values.current, sources.length), sheet, abort.signal) : result
      abort.signal.throwIfAborted()
      if (download) downloadOutput(updated.output)
      onApply(updated)
    } catch { if (!abort.signal.aborted) setError(true) }
    finally { if (!abort.signal.aborted) { setBusy(false); onBusy(false) } }
  }
  const empty = !(dirty ? values.current : sources).some(text => text.trim())
  return <Modal show onHide={close} fullscreen className="cn-ocr-text-editor" aria-labelledby={`${id}-title`}>
    <Modal.Header closeButton><Modal.Title id={`${id}-title`}>{t('editText')}</Modal.Title>
      <div className="cn-ocr-edit-zoom"><Button variant="outline-secondary" size="sm" aria-label={ocr('zoomOut')} disabled={zoom <= .3} onClick={() => setZoom(value => Math.max(.3, value - .1))}>−</Button><output>{Math.round(zoom * 100)}%</output><Button variant="outline-secondary" size="sm" aria-label={ocr('zoomIn')} disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .1))}>+</Button><Button variant="outline-secondary" size="sm" disabled={!layout} onClick={() => { if (layout) setZoom(Math.max(.3, Math.min(2, ((gallery.current?.clientWidth ?? window.innerWidth) - 32) / (layout.width * PX)))) }}>{pdf('preview.fitWidth')}</Button></div>
    </Modal.Header>
    <Modal.Body ref={gallery}>
      {!layout && !error ? <p role="status">{t('textPreviewLoading')}</p> : null}
      {layout?.pages.map((page, index) => <section className="cn-ocr-edit-sheet" key={index}><p>{t('textPage', { page: index + 1, total: layout.pages.length })}</p><EditablePaper text={page.lines.join('\n')} label={`${t('editText')} — ${index + 1}`} layout={layout} zoom={zoom} disabled={busy} onChange={text => { values.current[index] = text; setRevision(value => value + 1) }} /></section>)}
      {error ? <p role="alert" className="erp-tool-form__error mt-2">{t('editTextFailed')}</p> : null}
    </Modal.Body>
    <Modal.Footer><Button variant="outline-secondary" onClick={close}>{t('cancel')}</Button><Button variant="outline-primary" disabled={busy || !layout || empty} onClick={() => void apply(false)}>{t('applyText')}</Button><Button variant="primary" disabled={busy || !layout || empty} onClick={() => void apply(true)}>{busy ? <Spinner as="span" size="sm" className="me-2" /> : null}{pdf('imagesPdfStudio.download')}</Button></Modal.Footer>
  </Modal>
}
