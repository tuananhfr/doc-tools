import { useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel, downloadOutput } from '@/features/tools/hub'
import { applyBackgroundMask, detectSolidBackground, paintBackgroundMask } from '../services/background-removal'

type CanvasState = { source: ImageData; mask: Uint8Array; previous: Uint8Array | null }

export default function RemoveBackgroundPage() {
  const { t } = useTranslation('image')
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef<CanvasState | null>(null)
  const drawing = useRef(false)
  const [name, setName] = useState('')
  const [tolerance, setTolerance] = useState(42)
  const [brush, setBrush] = useState<'off' | 'erase' | 'keep'>('off')
  const [radius, setRadius] = useState(24)
  const [background, setBackground] = useState('transparent')
  const [message, setMessage] = useState('')
  const [hasUndo, setHasUndo] = useState(false)
  const draw = (nextBackground = background) => {
    const current = state.current, target = canvas.current
    if (!current || !target) return
    target.getContext('2d')?.putImageData(applyBackgroundMask(current.source, current.mask, nextBackground === 'transparent' ? null : nextBackground), 0, 0)
  }
  const open = async (file: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) { setMessage(t('removeBg.invalidFile')); return }
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
      state.current = { source, mask: detectSolidBackground(source, tolerance), previous: null }
      setHasUndo(false)
      setName(file.name)
      setMessage(t('removeBg.processed', { width, height }))
      draw()
    } catch (error) { setMessage(error instanceof Error ? error.message : t('removeBg.openFailed')) }
  }
  const recalculate = (next: number) => { setTolerance(next); if (state.current) { state.current.mask = detectSolidBackground(state.current.source, next); state.current.previous = null; setHasUndo(false); draw() } }
  const brushAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = state.current, target = canvas.current
    if (!current || !target || brush === 'off') return
    const bounds = target.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * current.source.width / bounds.width
    const y = (event.clientY - bounds.top) * current.source.height / bounds.height
    paintBackgroundMask(current.mask, current.source.width, current.source.height, x, y, radius, brush === 'keep')
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
      <div className="mt-3" style={{ background: 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 20px 20px' }}><canvas ref={canvas} style={{ width: '100%', display: 'block', touchAction: 'none', cursor: brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={(event) => { if (brush === 'off' || !state.current) return; drawing.current = true; state.current.previous = state.current.mask.slice(); setHasUndo(true); event.currentTarget.setPointerCapture(event.pointerId); brushAt(event) }} onPointerMove={(event) => { if (drawing.current) brushAt(event) }} onPointerUp={() => { drawing.current = false }} /></div>
      <Button variant="outline-secondary" className="mt-3" disabled={!hasUndo} onClick={() => { if (!state.current?.previous) return; state.current.mask = state.current.previous; state.current.previous = null; setHasUndo(false); draw() }}>{t('removeBg.undoBrush')}</Button>
      <p className="mt-3">{t('removeBg.note')}</p>
    </ToolPanel>
  </ToolBoard>
}
