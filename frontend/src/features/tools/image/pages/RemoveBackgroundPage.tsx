import { useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel, downloadOutput } from '@/features/tools/hub'
import { applyBackgroundMask, detectSolidBackground, paintBackgroundMask } from '../services/background-removal'

type CanvasState = { source: ImageData; mask: Uint8Array; previous: Uint8Array | null }

export default function RemoveBackgroundPage() {
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
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) { setMessage('Chọn ảnh JPG, PNG hoặc WebP dưới 20 MB.'); return }
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
      const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale)
      if (!width || !height) throw new Error('Kích thước ảnh không hợp lệ.')
      const target = canvas.current!
      target.width = width; target.height = height
      const context = target.getContext('2d', { willReadFrequently: true })!
      context.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      const source = context.getImageData(0, 0, width, height)
      state.current = { source, mask: detectSolidBackground(source, tolerance), previous: null }
      setHasUndo(false)
      setName(file.name)
      setMessage(`Đã xử lý ảnh ${width} × ${height}. Nền nhiều màu cần chỉnh bằng cọ.`)
      draw()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không mở được ảnh.') }
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
  const save = () => { if (!canvas.current || !state.current) return; canvas.current.toBlob((blob) => { if (!blob) { setMessage('Không xuất được ảnh.'); return }; downloadOutput({ name: `${name.replace(/\.[^.]+$/, '')}-xoa-phong.png`, blob }); setMessage('Đã tạo PNG. Hãy xem kỹ mép vật thể trước khi dùng.') }, 'image/png') }
  return <ToolBoard side={<div className="erp-tool-result" role="status"><p className="erp-tool-result__label">Kết quả</p><p className="erp-tool-result__value">{name || 'Chưa chọn ảnh'}</p><p className="erp-tool-result__note">{message || 'Tự nhận màu nền từ viền ảnh. Phù hợp phông trơn; cọ giữ/xóa sửa vùng sai.'}</p><Button disabled={!name} onClick={save}>Tải ảnh PNG</Button></div>}>
    <ToolPanel title="Xóa phông nền trơn">
      <label className="erp-flow-field__label">Chọn ảnh<Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void open(file) }} /></label>
      <label className="erp-flow-field__label mt-3">Độ nhạy màu nền: {tolerance}<Form.Range min={5} max={120} value={tolerance} onChange={(event) => recalculate(Number(event.target.value))} /></label>
      <label className="erp-flow-field__label mt-3">Nền mới<Form.Select value={background} onChange={(event) => { setBackground(event.target.value); draw(event.target.value) }}><option value="transparent">Trong suốt</option><option value="#ffffff">Trắng</option><option value="#4a90d9">Xanh ảnh thẻ</option></Form.Select></label>
      <label className="erp-flow-field__label mt-3">Chỉnh bằng cọ<Form.Select value={brush} onChange={(event) => setBrush(event.target.value as typeof brush)}><option value="off">Không dùng</option><option value="erase">Xóa thêm</option><option value="keep">Giữ lại</option></Form.Select></label>
      {brush !== 'off' ? <label className="erp-flow-field__label mt-3">Cỡ cọ: {radius}<Form.Range min={4} max={100} value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></label> : null}
      <div className="mt-3" style={{ background: 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 20px 20px' }}><canvas ref={canvas} style={{ width: '100%', display: 'block', touchAction: 'none', cursor: brush === 'off' ? 'default' : 'crosshair' }} onPointerDown={(event) => { if (brush === 'off' || !state.current) return; drawing.current = true; state.current.previous = state.current.mask.slice(); setHasUndo(true); event.currentTarget.setPointerCapture(event.pointerId); brushAt(event) }} onPointerMove={(event) => { if (drawing.current) brushAt(event) }} onPointerUp={() => { drawing.current = false }} /></div>
      <Button variant="outline-secondary" className="mt-3" disabled={!hasUndo} onClick={() => { if (!state.current?.previous) return; state.current.mask = state.current.previous; state.current.previous = null; setHasUndo(false); draw() }}>Hoàn tác cọ</Button>
      <p className="mt-3">Ảnh xử lý trên máy. Nền nhiều chi tiết cần cọ chỉnh tay; ảnh lớn được thu tối đa còn 2200 px mỗi cạnh.</p>
    </ToolPanel>
  </ToolBoard>
}
