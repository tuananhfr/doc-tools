import { useState } from 'react'
import { VideoWorkspace } from '../components/VideoWorkspace'
import { VideoTimeRange } from '../components/VideoTimeRange'

export default function TrimVideoPage() {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(5)
  return <VideoWorkspace options={{ action: 'trim', start, end }} actionLabel="Cắt video" note="Nhập thời gian theo giây. Đoạn được mã hóa lại để cắt theo khung hình, xuất MP4; cạnh dài tối đa 1080 px.">
    <VideoTimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
  </VideoWorkspace>
}
