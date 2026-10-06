import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { VideoWorkspace } from '../components/VideoWorkspace'

export default function CompressVideoPage() {
  const [quality, setQuality] = useState<23 | 28 | 32>(28)
  const [edge, setEdge] = useState<720 | 1080>(720)
  return <VideoWorkspace options={{ action: 'compress', quality, edge }} actionLabel="Nén video" note="Xuất MP4 H.264/AAC. Nén làm giảm chất lượng; dung lượng cuối phụ thuộc nội dung và độ nén của bản gốc.">
    <div className="erp-tool-form__grid">
      <label className="erp-flow-field__label">Mức nén<Form.Select value={quality} onChange={(event) => setQuality(Number(event.target.value) as typeof quality)}><option value={23}>Nhẹ · ưu tiên hình ảnh</option><option value={28}>Vừa · cân bằng</option><option value={32}>Mạnh · ưu tiên dung lượng</option></Form.Select></label>
      <label className="erp-flow-field__label">Cạnh dài tối đa<Form.Select value={edge} onChange={(event) => setEdge(Number(event.target.value) as typeof edge)}><option value={720}>720 px</option><option value={1080}>1080 px</option></Form.Select></label>
    </div>
  </VideoWorkspace>
}
