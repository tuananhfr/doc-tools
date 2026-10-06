import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { VideoWorkspace } from '../components/VideoWorkspace'

export default function ExtractAudioPage() {
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3')
  return <VideoWorkspace options={{ action: 'audio', format }} actionLabel="Tách âm thanh" note="Xuất toàn bộ luồng âm thanh đầu tiên. MP3/M4A tiết kiệm dung lượng; WAV thường lớn hơn. Video không có âm thanh sẽ được báo rõ.">
    <label className="erp-flow-field__label">Định dạng âm thanh<Form.Select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="mp3">MP3 · dùng phổ biến</option><option value="m4a">M4A · AAC</option><option value="wav">WAV · không nén</option></Form.Select></label>
  </VideoWorkspace>
}
