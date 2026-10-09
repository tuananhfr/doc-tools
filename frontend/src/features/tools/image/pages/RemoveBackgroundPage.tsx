import { useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel, downloadOutput } from '@/features/tools/hub'
import { applyBackgroundMask, detectSolidBackground } from '../services/background-removal'
import { composeMask, newStrokeEdit, paintStroke, pushStroke, STROKE_ERASE, STROKE_KEEP, undoStroke, type StrokeEdit } from '../utils/mask-strokes'

// `auto` dò lại mỗi lần đổi độ nhạy; `strokes` là lớp nét cọ riêng nên không bị dò lại xoá mất.
type CanvasState = { source: ImageData; auto: Uint8Array; strokes: Uint8Array; mask: Uint8Array }

export default function RemoveBackgroundPage() {
  const { t } = useTranslation('image')
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef<CanvasState | null>(null)
  const stroke = useRef<StrokeEdit | null>(null)
  const history = useRef<StrokeEdit[]>([])
  const [name, setName] = useState('')
  const [tolerance, setTolerance] = useState(42)
  const [brush, setBrush] = useState<'off' | 'erase' | 'keep'>('off')
  const [radius, setRadius] = useState(24)
  const [background, setBackground] = useState('transparent')
  const [message, setMessage] = useState('')
  const [undoSteps, setUndoSteps] = useState(0)
  const draw = (nextBackground = background) => {
    const current = state.current, target = canvas.current
    if (!current || !target) return
    composeMask(current.auto, current.strokes, current.mask)
    target.getContext('2d')?.putImageData(applyBackgroundMask(current.source, current.mask, nextBackground === 'transparent' ? null : nextBackground), 0, 0)
  }
  const resetHistory = () => { history.current = []; stroke.current = null; setUndoSteps(0) }
  // Chọn tệp hỏng mà vẫn giữ ảnh cũ thì nút tải về xuất nhầm ảnh trước — xoá hẳn.
  const clear = () => {
    state.current = null
    resetHistory()
    setName('')
    if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0 }
  }
  const open = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) { clear(); setMessage(t('removeBg.invalidFile')); return }
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
      const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale)
      if (!width || !height) throw new Error(t('removeBg.invalidSize'))
      const target = canvas.current!
      target.width = width; target.height = height
      const context = target.getContext('2d', { willReadFrequently: true })!
      context.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      const source = context.getImageData(0, 0, width, height)
      const total = width * height
      state.current = { source, auto: detectSolidBackground(source, tolerance), strokes: new Uint8Array(total), mask: new Uint8Array(total) }
      resetHistory()
      setName(file.name)
      setMessage(t('removeBg.processed', { width, height }))
      draw()
    } catch (error) { clear(); setMessage(error instanceof Error ? error.message : t('removeBg.openFailed')) }
  }
  const recalculate = (next: number) => { setTolerance(next); if (state.current) { state.current.auto = detectSolidBackground(state.current.source, next); draw() } }
  const brushAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = state.current, target = canvas.current, edit = stroke.current
    if (!current || !target || !edit || brush === 'off') return
    const bounds = target.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * current.source.width / bounds.width
    const y = (event.clientY - bounds.top) * current.source.height / bounds.height
    paintStroke(current.strokes, current.source.width, current.source.height, x, y, radius, brush === 'keep' ? STROKE_KEEP : STROKE_ERASE, edit)
    draw()
  }
  const endStroke = () => {
    if (!stroke.current) return
    history.current = pushStroke(history.current, stroke.current)
    stroke.current = null
    setUndoSteps(history.current.length)
  }
  const undo = () => {
    const edit = history.current.pop()
    if (!edit || !state.current) return
    undoStroke(state.current.strokes, edit)
    setUndoSteps(history.current.length)
    draw()
  }
  const save = () => { if (!canvas.current || !state.current) return; canvas.current.toBlob((blob) => { if (!blob) { setMessage(t('removeBg.exportFailed')); return }; downloadOutput({ name: `${name.replace(/\.[^.]+$/, '')}-xoa-phong.png`, blob }); setMessage(t('removeBg.done')) }, 'image/png') }
  return <ToolBoard side={<div className="erp-tool-result" role="status"><p className="erp-tool-result__label">{t('shared.result')}</p><p className="erp-tool-result__value">{name || t('removeBg.noImage')}</p><p className="erp-tool-result__note">{message || t('removeBg.idle')}</p><Button disabled={!name} onClick={save}>{t('removeBg.download')}</Button></div>}>
    <ToolPanel title={t('removeBg.panel')}>
      <label className="erp-flow-field__label">{t('removeBg.choose')}<Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void open(file) }} /></label>
      <label className="erp-flow-field__label mt-3">{t('removeBg.tolerance', { value: tolerance })}<Form.Range min={5} max={120} value={tolerance} onChange={(event) => recalculate(Number(event.target.value))} /></label>
      <label className="erp-flow-field__label mt-3">{t('removeBg.background')}<Form.Select value={background} onChange={(event) => { setBackground(event.target.value); draw(event.target.value) }}><option value="transparent">{t('removeBg.backgroundTransparent')}</option><option value="#ffffff">{t('removeBg.backgroundWhite')}</option><option value="#4a90d9">{t('removeBg.backgroundIdBlue')}</option></Form.Select></label>
      <label className="erp-flow-field__label mt-3">{t('removeBg.brush')}<Form.Select value={brush} onChange={(event) => setBrush(event.target.value as typeof brush)}><option value="off">{t('removeBg.brushOff')}</option><option value="erase">{t('removeBg.brushErase')}</option><option value="keep">{t('removeBg.brushKeep')}</option></Form.Select></label>
      {brush !== 'off' ? <label className="erp-flow-field__label mt-3">{t('removeBg.brushSize', { value: radius })}<Form.Range min={4} max={100} value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></label> : null}
      <div className="mt-3" style={{ background: 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 20px 20px' }}><canvas ref={canvas} style={{ width: '100%', display: 'block', touchAction: 'none', cursor: brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={(event) => { if (brush === 'off' || !state.current) return; stroke.current = newStrokeEdit(); event.currentTarget.setPointerCapture(event.pointerId); brushAt(event) }} onPointerMove={(event) => { if (stroke.current) brushAt(event) }} onPointerUp={endStroke} onPointerCancel={endStroke} /></div>
      <Button variant="outline-secondary" className="mt-3" disabled={!undoSteps} onClick={undo}>{undoSteps ? t('removeBg.undoBrushSteps', { steps: undoSteps }) : t('removeBg.undoBrush')}</Button>
      <p className="mt-3">{t('removeBg.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
