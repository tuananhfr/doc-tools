import { useEffect, useRef, useState } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import type { QuickItem } from '../../hooks/useQuickSources'
import type { Quad } from '../../types/text-layer.types'
import { findScanCorners, loadScanCanvas, scanDocument } from '../../services/document-scan'
import { FULL_SCAN_CORNERS, isWholeScanImage, type ScanOptions, type ScanPreset } from '../../utils/document-scan'
import { validPaperCorners } from '../../utils/ocr-perspective'

export function DocumentScanModal({ item, initial, onApply, onClose }: { item: QuickItem; initial?: ScanOptions; onApply: (item: QuickItem, options: ScanOptions) => void; onClose: () => void }) {
  const { t } = useTranslation('pdf', { keyPrefix: 'documentScan' })
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null), controller = useRef<AbortController | null>(null)
  const drag = useRef<number | null>(null), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(false), [detected, setDetected] = useState(false)
  const [options, setOptions] = useState<ScanOptions>(initial ?? { corners: FULL_SCAN_CORNERS, preset: 'color', rotation: 0, deskew: true })
  const valid = validPaperCorners(options.corners, 1, 1)
  const wholeImage = isWholeScanImage(options.corners)
  const [keepWhole, setKeepWhole] = useState(false)
  useEffect(() => {
    let live = true
    if (item.source.kind !== 'image') return
    void loadScanCanvas(item.source).then(image => {
      try {
        if (!live || !canvas.current) return
        canvas.current.width = image.width; canvas.current.height = image.height
        canvas.current.getContext('2d')!.drawImage(image, 0, 0)
        const corners = findScanCorners(image); setDetected(!!corners)
        if (!initial && corners) setOptions(current => ({ ...current, corners }))
        setReady(true)
      } finally { image.width = 1; image.height = 1 }
    }).catch(() => { if (live) setError(true) })
    return () => { live = false; controller.current?.abort() }
  }, [item, initial])
  function move(index: number, x: number, y: number) {
    if (busy) return
    setOptions(current => ({ ...current, corners: current.corners.map((point, i) => i === index ? { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) } : point) as Quad }))
  }
  async function apply() {
    if (!ready || !valid || busy || (wholeImage && !keepWhole)) return
    const task = new AbortController(); controller.current = task; setBusy(true); setError(false)
    try { const result = await scanDocument(item, options, task.signal); if (!task.signal.aborted) onApply(result, options) }
    catch { if (!task.signal.aborted) setError(true) }
    finally { if (!task.signal.aborted) setBusy(false) }
  }
  return <Modal show onHide={() => { controller.current?.abort(); onClose() }} size="lg" centered scrollable className="cn-document-scan">
    <Modal.Header closeButton><Modal.Title>{t('title')}</Modal.Title></Modal.Header>
    <Modal.Body>
      <p>{t('hint')}</p>
      <p className="cn-idstudio-note" role="status">{ready ? detected ? t('detected') : t('manual') : error ? t('failed') : t('loading')}</p>
      <div className="cn-document-scan__stage" ref={stage} onPointerMove={event => {
        if (drag.current === null || !stage.current) return
        const box = stage.current.getBoundingClientRect(); move(drag.current, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height)
      }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <canvas ref={canvas} aria-label={t('original')} />
        {ready ? <><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points={options.corners.map(p => `${p.x*100},${p.y*100}`).join(' ')} /></svg>
          {options.corners.map((point, index) => <button key={index} type="button" className="cn-document-scan__corner" aria-label={t('corner', { index: index + 1 })} disabled={busy} style={{ left: `${point.x*100}%`, top: `${point.y*100}%` }} onPointerDown={event => { event.preventDefault(); drag.current = index; event.currentTarget.setPointerCapture(event.pointerId) }} onKeyDown={event => {
            const directions: Record<string, [number, number]> = { ArrowLeft: [-.005, 0], ArrowRight: [.005, 0], ArrowUp: [0, -.005], ArrowDown: [0, .005] }
            const step = directions[event.key]; if (step) { event.preventDefault(); move(index, point.x + step[0], point.y + step[1]) }
          }}>{index + 1}</button>)}
        </> : null}
      </div>
      {!valid ? <p role="alert">{t('invalid')}</p> : null}
      {ready && wholeImage ? <div className="alert alert-warning" role="status"><p>{t('wholeWarning')}</p><label><input type="checkbox" checked={keepWhole} disabled={busy} onChange={event => setKeepWhole(event.target.checked)} /> {t('confirmWhole')}</label></div> : null}
      <fieldset disabled={!ready || busy} className="cn-document-scan__options">
        <div className="cn-document-scan__actions"><Button variant="outline-secondary" size="sm" onClick={() => { const corners = canvas.current ? findScanCorners(canvas.current) : null; setDetected(!!corners); if (corners) setOptions(current => ({ ...current, corners })) }}>{t('detect')}</Button><Button variant="outline-secondary" size="sm" onClick={() => setOptions(current => ({ ...current, corners: FULL_SCAN_CORNERS }))}>{t('full')}</Button></div>
        <div className="cn-document-scan__presets">{(['color', 'auto', 'white', 'bw'] as ScanPreset[]).map(preset => <button type="button" key={preset} aria-pressed={options.preset === preset} onClick={() => setOptions(current => ({ ...current, preset }))}>{t(`presets.${preset}`)}</button>)}</div>
        {options.preset === 'bw' ? <p className="cn-idstudio-note">{t('bwWarning')}</p> : null}
        <label><input type="checkbox" checked={options.deskew} onChange={event => setOptions(current => ({ ...current, deskew: event.target.checked }))} /> {t('deskew')}</label>
        <label>{t('rotate')} <select value={options.rotation} onChange={event => setOptions(current => ({ ...current, rotation: Number(event.target.value) as ScanOptions['rotation'] }))}>{[0,90,180,270].map(value => <option key={value} value={value}>{value}°</option>)}</select></label>
      </fieldset>
      <p className="cn-idstudio-note">{t('review')}</p>
      {error ? <p role="alert">{t('failed')}</p> : null}
    </Modal.Body>
    <Modal.Footer><Button variant="outline-secondary" onClick={() => { controller.current?.abort(); onClose() }}>{t('cancel')}</Button><Button variant="primary" className="cn-document-scan__apply" disabled={!ready || !valid || busy || (wholeImage && !keepWhole)} onClick={() => void apply()}>{busy ? <Spinner as="span" size="sm" /> : null} {busy ? t('processing') : t('apply')}</Button></Modal.Footer>
  </Modal>
}
