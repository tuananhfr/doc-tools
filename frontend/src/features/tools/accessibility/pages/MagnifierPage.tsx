import { useEffect, useRef, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'

export default function MagnifierPage() {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [open, setOpen] = useState(false)
  const [frozen, setFrozen] = useState(false)
  const [zoom, setZoom] = useState(2)
  const [contrast, setContrast] = useState(false)
  const [error, setError] = useState('')
  const stop = () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setOpen(false); setFrozen(false)
  }
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()) }, [])
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setError('Trình duyệt này không hỗ trợ camera.'); return }
    try {
      stop()
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      stream.current = next
      if (video.current) { video.current.srcObject = next; await video.current.play() }
      setOpen(true); setError('')
    } catch { stop(); setError('Không mở được camera. Kiểm tra quyền truy cập và camera đang dùng.') }
  }
  const freeze = () => {
    if (!video.current) return
    if (video.current.paused) { void video.current.play(); setFrozen(false) } else { video.current.pause(); setFrozen(true) }
  }
  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">Hình ảnh camera</p>
    <div style={{ overflow: 'hidden', borderRadius: 12, background: '#111', aspectRatio: '4 / 3', display: 'grid', placeItems: 'center' }}>
      <video ref={video} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, filter: contrast ? 'grayscale(1) contrast(2.2)' : undefined }} />
    </div>
    <p className="erp-tool-result__note mt-3">{open ? frozen ? 'Đã dừng hình' : 'Đang xem trực tiếp' : 'Bấm Mở camera để bắt đầu.'} Hình ảnh chỉ hiển thị trên thiết bị, không ghi lại hoặc gửi đi.</p>
    {error ? <p role="alert" className="erp-tool-result__note">{error}</p> : null}
  </div>}>
    <ToolPanel title="Kính lúp">
      <label className="erp-flow-field__label">Phóng to: {zoom}×<Form.Range min={1} max={6} step={0.5} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="d-flex flex-wrap gap-2"><Button onClick={start}>{open ? 'Đổi camera' : 'Mở camera'}</Button><Button variant="outline-secondary" disabled={!open} onClick={freeze}>{frozen ? 'Tiếp tục' : 'Dừng hình'}</Button><Button variant="outline-secondary" disabled={!open} onClick={() => setContrast((current) => !current)}>{contrast ? 'Tắt tương phản' : 'Tăng tương phản'}</Button><Button variant="outline-secondary" disabled={!open} onClick={stop}>Tắt camera</Button></div>
    </ToolPanel>
  </ToolBoard>
}
