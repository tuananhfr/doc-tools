import { useEffect, useId, useRef, useState } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { downloadOutput, type FlowResult } from '@/features/tools/hub'
import type { OcrEditableDocument, OcrTextStyle } from '../../types/ocr-document.types'
import type { OcrDocumentFragment, OcrDocumentPaper } from '../../utils/ocr-document-layout'
import { prepareOcrDocument, editOcrDocumentPdf } from '../../services/ocr-document-pdf'

const PX = 96 / 72, MM = 72 / 25.4
interface Selection { sourcePage: number; blockId: string; cellId?: string }
interface Draft extends Selection { start: number; end: number; text: string }

function NumberField({ label, value, min, max, step = 1, onCommit }: { label: string; value: number; min: number; max?: number; step?: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  return <label>{label}<input type="number" value={draft} min={min} max={max} step={step} onChange={event => setDraft(event.target.value)} onBlur={() => { const number = Number(draft); if (draft.trim() && Number.isFinite(number) && number >= min && (max === undefined || number <= max)) onCommit(number); else setDraft(String(value)) }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
}

function Fragment({ fragment, selected, disabled, label, onSelect, onDraft, onCommit }: { fragment: OcrDocumentFragment; selected: boolean; disabled: boolean; label: string; onSelect: () => void; onDraft: (text: string) => void; onCommit: () => void }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => { if (element.current) element.current.textContent = fragment.lines.map(line => line.text).join('\n') }, [fragment])
  const changed = () => onDraft(element.current?.innerText.replace(/\u00a0/g, ' ') ?? '')
  return <div ref={element} className={`cn-ocr-document-fragment${selected ? ' is-selected' : ''}`} role="textbox" aria-label={label} aria-multiline="true" tabIndex={0}
    contentEditable={disabled ? false : 'plaintext-only'} suppressContentEditableWarning spellCheck onFocus={onSelect} onInput={changed} onBlur={onCommit}
    onPaste={event => { event.preventDefault(); const text = event.clipboardData.getData('text/plain'), selection = window.getSelection(); if (selection?.rangeCount && element.current?.contains(selection.anchorNode)) { const range = selection.getRangeAt(0), node = window.document.createTextNode(text); range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); changed() } }} onDrop={event => event.preventDefault()}
    style={{ left: fragment.x * PX, top: fragment.y * PX, width: fragment.width * PX, minHeight: fragment.height * PX, fontFamily: fragment.font === 'serif' ? "'CN OCR Serif', serif" : "'CN OCR Sans', sans-serif", fontSize: fragment.fontSize * PX, lineHeight: `${fragment.fontSize * fragment.lineHeight * PX}px`, fontWeight: fragment.bold ? 700 : 400, fontStyle: fragment.italic ? 'italic' : 'normal', textAlign: fragment.align, textIndent: (fragment.lines[0].x - fragment.x) * PX }} />
}

export function OcrDocumentEditor({ result, onApply, onClose, onBusy }: { result: FlowResult; onApply: (result: FlowResult) => void; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const { t } = useTranslation('pdf', { keyPrefix: 'documentScan' }), { t: s } = useTranslation('pdf', { keyPrefix: 'documentScan.structure' }), { t: pdf } = useTranslation('pdf')
  const id = useId(), gallery = useRef<HTMLDivElement>(null), controller = useRef<AbortController | null>(null)
  const [value, setValue] = useState(() => structuredClone(result.ocrDocument!)), valueRef = useRef(value), drafts = useRef(new Map<string, Draft>())
  const [papers, setPapers] = useState<OcrDocumentPaper[]>([]), [selection, setSelection] = useState<Selection | null>(null), [zoom, setZoom] = useState(.7)
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(false)
  const dirty = useRef(false)
  const fitted = useRef(false)
  const publish = (next: OcrEditableDocument) => { valueRef.current = next; setValue(next); dirty.current = true }
  const commit = () => {
    if (!drafts.current.size) return valueRef.current
    const next = structuredClone(valueRef.current)
    for (const draft of [...drafts.current.values()].sort((a, b) => b.start - a.start)) {
      const block = next.pages[draft.sourcePage].blocks.find(block => block.id === draft.blockId)
      const target = block?.kind === 'text' ? block : block?.cells.find(cell => cell.id === draft.cellId)
      if (target) target.text = target.text.slice(0, draft.start) + draft.text.normalize('NFC') + target.text.slice(draft.end)
    }
    drafts.current.clear(); publish(next); return next
  }
  useEffect(() => {
    const abort = new AbortController(); setLoading(true)
    void prepareOcrDocument(value, abort.signal).then(prepared => {
      if (abort.signal.aborted) return
      setPapers(prepared.papers); setLoading(false)
      if (!fitted.current) { setZoom(Math.max(.25, Math.min(1, ((gallery.current?.clientWidth ?? window.innerWidth) - 40) / (prepared.papers[0].width * PX)))); fitted.current = true }
    }).catch(() => { if (!abort.signal.aborted) { setError(true); setLoading(false) } })
    return () => abort.abort()
  }, [value])
  useEffect(() => () => { controller.current?.abort(); onBusy(false) }, [onBusy])
  const block = selection && value.pages[selection.sourcePage]?.blocks.find(block => block.id === selection.blockId)
  const target = block && (block.kind === 'text' ? block : block.cells.find(cell => cell.id === selection?.cellId))
  const changeStyle = (patch: Partial<OcrTextStyle>, all = false) => {
    const next = structuredClone(commit())
    next.pages.forEach((page, sourcePage) => page.blocks.forEach(block => {
      const active = selection?.sourcePage === sourcePage && selection.blockId === block.id
      if (block.kind === 'text') { if (all || active) Object.assign(block, patch) }
      else block.cells.forEach(cell => { if (all || active && selection?.cellId === cell.id) Object.assign(cell, patch) })
    }))
    publish(next)
  }
  const geometry = (field: 'x' | 'width', mm: number) => {
    if (!selection || !block) return
    const next = structuredClone(commit()), page = next.pages[selection.sourcePage], target = page.blocks.find(b => b.id === block.id)!
    const number = Number.isFinite(mm) ? mm * MM : target[field]
    if (field === 'x') target.x = Math.max(0, Math.min(page.width - target.width, number))
    else {
      const width = Math.max(24, Math.min(page.width - target.x, number))
      if (target.kind === 'table') target.columns = target.columns.map(column => column * width / target.width)
      target.width = width
    }
    publish(next)
  }
  const columnWidth = (index: number, mm: number) => {
    if (!selection || block?.kind !== 'table' || !Number.isFinite(mm)) return
    const next = structuredClone(commit()), table = next.pages[selection.sourcePage].blocks.find(b => b.id === block.id)!
    if (table.kind !== 'table') return
    const width = Math.max(12, Math.min(table.width - (table.columns.length - 1) * 12, mm * MM)), remaining = table.width - table.columns[index]
    table.columns = table.columns.map((column, i) => i === index ? width : column * (table.width - width) / remaining)
    publish(next)
  }
  const close = () => { controller.current?.abort(); onBusy(false); onClose() }
  const apply = async (download: boolean) => {
    const pending = drafts.current.size > 0, document = commit(), abort = new AbortController(); controller.current = abort
    setBusy(true); onBusy(true); setError(false)
    try {
      const updated = dirty.current || pending ? await editOcrDocumentPdf(result, document, abort.signal) : result
      abort.signal.throwIfAborted(); if (download) downloadOutput(updated.output); onApply(updated)
    } catch { if (!abort.signal.aborted) setError(true) }
    finally { if (!abort.signal.aborted) { setBusy(false); onBusy(false) } }
  }
  return <Modal show onHide={close} fullscreen className="cn-ocr-text-editor cn-ocr-document-editor" aria-labelledby={`${id}-title`}>
    <Modal.Header closeButton><Modal.Title id={`${id}-title`}>{t('editText')}</Modal.Title><div className="cn-ocr-edit-zoom"><Button variant="outline-secondary" size="sm" aria-label={s('zoomOut')} disabled={zoom <= .25} onClick={() => setZoom(z => Math.max(.25, z - .1))}>−</Button><output>{Math.round(zoom * 100)}%</output><Button variant="outline-secondary" size="sm" aria-label={s('zoomIn')} disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .1))}>+</Button><Button variant="outline-secondary" size="sm" onClick={() => setZoom(Math.max(.25, Math.min(2, ((gallery.current?.clientWidth ?? window.innerWidth) - 40) / (papers[0]?.width * PX || 794))))}>{pdf('preview.fitWidth')}</Button></div></Modal.Header>
    <Modal.Body className="cn-ocr-document-body">
      <aside className="cn-ocr-document-tools" aria-label={s('format')}><p>{s('hint')}</p>
        <fieldset disabled={busy || !target}><legend>{s('format')}</legend>
          <label>{s('font')}<select aria-label={s('font')} value={target?.font ?? 'sans'} onChange={event => changeStyle({ font: event.target.value as OcrTextStyle['font'] })}><option value="sans">{s('sans')}</option><option value="serif">{s('serif')}</option></select></label>
          <div className="cn-ocr-document-pair"><NumberField label={s('size')} min={6} max={48} step={.5} value={+(target?.fontSize ?? 11).toFixed(1)} onCommit={fontSize => changeStyle({ fontSize })} /><NumberField label={s('spacing')} min={1} max={2.5} step={.1} value={target?.lineHeight ?? 1.2} onCommit={lineHeight => changeStyle({ lineHeight })} /></div>
          <div className="cn-ocr-document-buttons"><button type="button" aria-pressed={target?.bold ?? false} onClick={() => changeStyle({ bold: !target?.bold })}><b>{s('bold')}</b></button><button type="button" aria-pressed={target?.italic ?? false} onClick={() => changeStyle({ italic: !target?.italic })}><i>{s('italic')}</i></button></div>
          <label>{s('align')}<select aria-label={s('align')} value={target?.align ?? 'left'} onChange={event => changeStyle({ align: event.target.value as OcrTextStyle['align'] })}><option value="left">{s('left')}</option><option value="center">{s('center')}</option><option value="right">{s('right')}</option></select></label>
          <Button size="sm" variant="outline-secondary" onClick={() => { if (target) changeStyle({ font: target.font, fontSize: target.fontSize, bold: target.bold, italic: target.italic, align: target.align, lineHeight: target.lineHeight }, true) }}>{s('applyAll')}</Button>
        </fieldset>
        {block ? <fieldset disabled={busy}><legend>{s('position')}</legend><div className="cn-ocr-document-pair"><NumberField label={s('indent')} min={0} value={+(block.x / MM).toFixed(1)} onCommit={number => geometry('x', number)} /><NumberField label={s('width')} min={10} value={+(block.width / MM).toFixed(1)} onCommit={number => geometry('width', number)} /></div></fieldset> : null}
        {block?.kind === 'table' ? <fieldset disabled={busy}><legend>{s('columns')}</legend><div className="cn-ocr-document-pair">{block.columns.map((width, i) => <NumberField key={i} label={s('column', { number: i + 1 })} min={5} value={+(width / MM).toFixed(1)} onCommit={number => columnWidth(i, number)} />)}</div></fieldset> : null}
        {loading ? <span role="status"><Spinner size="sm" /> {t('textPreviewLoading')}</span> : null}
        {error ? <p role="alert" className="erp-tool-form__error">{t('editTextFailed')}</p> : null}
      </aside>
      <div ref={gallery} className="cn-ocr-document-gallery">{papers.map((paper, index) => <section className="cn-ocr-edit-sheet" key={index}><p>{t('textPage', { page: index + 1, total: papers.length })}</p><div className="cn-ocr-document-paper cn-ocr-edit-paper" style={{ width: paper.width * PX, height: paper.height * PX, zoom }}>
        {paper.borders.map((border, i) => <div key={`border-${i}`} className="cn-ocr-document-border" style={{ left: border.x * PX, top: border.y * PX, width: border.width * PX, height: border.height * PX }} />)}
        {paper.fragments.map((fragment, i) => <Fragment key={`${fragment.blockId}:${fragment.cellId ?? ''}:${fragment.start}:${i}`} fragment={fragment} selected={selection?.sourcePage === fragment.sourcePage && selection.blockId === fragment.blockId && selection.cellId === fragment.cellId} disabled={busy} label={fragment.cellId ? s('cell') : s('paragraph')} onSelect={() => setSelection({ sourcePage: fragment.sourcePage, blockId: fragment.blockId, cellId: fragment.cellId })} onDraft={text => { drafts.current.set(`${fragment.sourcePage}:${fragment.blockId}:${fragment.cellId ?? ''}:${fragment.start}`, { ...fragment, text }); dirty.current = true }} onCommit={commit} />)}
      </div></section>)}</div>
    </Modal.Body>
    <Modal.Footer><Button variant="outline-secondary" onClick={close}>{t('cancel')}</Button><Button variant="outline-primary" disabled={busy || !papers.length} onClick={() => void apply(false)}>{t('applyText')}</Button><Button variant="primary" disabled={busy || !papers.length} onClick={() => void apply(true)}>{busy ? <Spinner size="sm" className="me-2" /> : null}{pdf('imagesPdfStudio.download')}</Button></Modal.Footer>
  </Modal>
}
