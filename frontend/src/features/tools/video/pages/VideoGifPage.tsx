import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { VideoWorkspace } from '../components/VideoWorkspace'
import { VideoTimeRange } from '../components/VideoTimeRange'

export default function VideoGifPage() {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(3)
  const [width, setWidth] = useState<320 | 480 | 640>(480)
  const [fps, setFps] = useState<8 | 12 | 15>(12)
  return <VideoWorkspace options={{ action: 'gif', start, end, width, fps }} actionLabel="Tạo GIF" note="GIF không có âm thanh và lặp liên tục. Chọn đoạn tối đa 20 giây; giảm chiều rộng hoặc số khung hình để giảm dung lượng.">
    <VideoTimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
    <div className="erp-tool-form__grid mt-3">
      <label className="erp-flow-field__label">Chiều rộng<Form.Select value={width} onChange={(event) => setWidth(Number(event.target.value) as typeof width)}><option value={320}>320 px</option><option value={480}>480 px</option><option value={640}>640 px</option></Form.Select></label>
      <label className="erp-flow-field__label">Khung hình/giây<Form.Select value={fps} onChange={(event) => setFps(Number(event.target.value) as typeof fps)}><option value={8}>8 · tệp nhỏ</option><option value={12}>12 · cân bằng</option><option value={15}>15 · chuyển động mượt hơn</option></Form.Select></label>
    </div>
  </VideoWorkspace>
}
