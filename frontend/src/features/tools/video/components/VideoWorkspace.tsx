import { useEffect, useState, type ReactNode } from 'react'
import { Button, Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useVideoTask } from '../hooks/useVideoTask'
import { videoEngineSupported } from '../services/video-engine'
import { validateVideoFile, VIDEO_ACCEPT } from '../services/video-validation'
import type { VideoOptions, VideoProgress } from '../types/video.types'
import styles from './VideoWorkspace.module.css'

const phaseLabels: Record<VideoProgress['phase'], string> = { loading: 'Đang tải bộ xử lý…', reading: 'Đang đọc video…', processing: 'Đang xử lý video…', saving: 'Đang chuẩn bị kết quả…' }
const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

export function VideoWorkspace({ options, children, actionLabel, note }: { options: VideoOptions; children: ReactNode; actionLabel: string; note: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const task = useVideoTask()
  const inputUrl = useObjectUrl(file)
  const outputUrl = useObjectUrl(task.output?.blob ?? null)
  useEffect(() => setSupported(videoEngineSupported()), [])
  const chooseFile = (next: File | null) => {
    task.reset()
    setDuration(null)
    setFileError('')
    setFile(null)
    if (!next) return
    try { validateVideoFile(next); setFile(next) }
    catch (error) { setFileError(error instanceof Error ? error.message : 'Không chọn được video.') }
  }
  const output = task.output
  const progress = task.progress
  const saving = output && file ? Math.round((1 - output.blob.size / file.size) * 100) : 0
  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">Kết quả</p>
    <p className={`erp-tool-result__value ${styles.name}`}>{output ? sizeLabel(output.blob.size) : 'Chưa có tệp mới'}</p>
    <div role="status" aria-live="polite" className="erp-tool-result__note">{fileError || task.message || (progress ? phaseLabels[progress.phase] : 'Chọn video, chỉnh thiết lập rồi bấm xử lý.')}</div>
    {progress ? <><progress className={styles.progress} aria-label="Tiến trình xử lý video" max={100} value={progress.percent ?? undefined} /><p className={styles.note}>{progress.percent === null ? phaseLabels[progress.phase] : `${progress.percent}% · Tiến trình ước tính`}</p></> : null}
    <div className={styles.actions}>
      <Button disabled={!file || task.busy || supported === false} onClick={() => { if (file) void task.run(file, options) }}>{task.busy ? 'Đang xử lý…' : actionLabel}</Button>
      {task.busy ? <Button variant="outline-secondary" onClick={task.cancel}>Hủy xử lý</Button> : null}
    </div>
    {output ? <>
      <p className={`${styles.name} mt-3`}>{output.name}</p>
      {options.action === 'compress' ? <p className={styles.note}>{saving > 0 ? `Nhỏ hơn bản gốc ${saving}%.` : 'Bản mới không nhỏ hơn bản gốc. Video đã nén sẵn có thể tăng dung lượng; thử mức nén mạnh hơn.'}</p> : null}
      {output.blob.type.startsWith('video/') ? <video className={styles.preview} src={outputUrl} controls playsInline preload="metadata" aria-label="Video kết quả" /> : output.blob.type.startsWith('audio/') ? <audio className={styles.audio} src={outputUrl} controls preload="metadata" aria-label="Âm thanh kết quả" /> : <img className={styles.preview} src={outputUrl} alt="Ảnh GIF kết quả" />}
      <Button className="mt-3" variant="outline-primary" onClick={() => downloadOutput({ name: output.name, blob: output.blob })}>Tải kết quả</Button>
    </> : null}
  </div>}>
    <ToolPanel title="Video của bạn">
      <label className="erp-flow-field__label">Chọn một video<Form.Control disabled={task.busy} type="file" accept={VIDEO_ACCEPT} onChange={(event) => chooseFile((event.target as HTMLInputElement).files?.[0] ?? null)} /></label>
      <p className={`${styles.note} mt-2`}>Tối đa 100 MB, 10 phút và 4K. Trên điện thoại, nên dùng đoạn ngắn dưới 30 MB. Không tải tệp lên máy chủ.</p>
      {supported === false ? <p role="alert">Trình duyệt chưa hỗ trợ xử lý video. Hãy thử trình duyệt mới trên máy tính.</p> : null}
      {file ? <><p className={`${styles.name} mt-3`}>{file.name} · {sizeLabel(file.size)}{duration !== null ? ` · ${duration.toFixed(2)} giây` : ''}</p>
        <video key={inputUrl} className={styles.preview} src={inputUrl} controls playsInline preload="metadata" aria-label="Video gốc" onLoadedMetadata={(event) => { const value = event.currentTarget.duration; setDuration(Number.isFinite(value) ? value : null) }} />
        <p className={styles.note}>Nếu trình duyệt không phát được bản gốc, bạn vẫn có thể thử xử lý. Bộ xử lý sẽ kiểm tra codec và thời lượng.</p></> : null}
      <fieldset disabled={task.busy} className={styles.settings}><legend className="visually-hidden">Thiết lập xử lý video</legend>{children}</fieldset>
      <p className={`${styles.note} mt-3`}>{note}</p>
      <p className={styles.note}>Lần đầu bấm xử lý sẽ tải thêm bộ xử lý khoảng 32 MB. Tác vụ có thể chậm hoặc thiếu bộ nhớ trên điện thoại. Kết quả không giữ metadata của tệp gốc.</p>
      <a className={styles.note} href={withBase('/vendor/ffmpeg/NOTICE.txt')} target="_blank" rel="noopener noreferrer">Giấy phép và mã nguồn FFmpeg GPL</a>
    </ToolPanel>
  </ToolBoard>
}
