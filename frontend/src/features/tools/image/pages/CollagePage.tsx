import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { makeImageCollage } from '../services/collage'

export default function CollagePage() {
  const [files, setFiles] = useState<File[]>([])
  const [columns, setColumns] = useState(2)
  const [gap, setGap] = useState(12)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const process = async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = await makeImageCollage(files, columns, gap)
      downloadOutput({ name: 'anh-ghep.png', blob })
      setMessage('Đã tải ảnh ghép PNG. Kiểm tra bố cục trước khi sử dụng.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được ảnh ghép.')
    } finally {
      setBusy(false)
    }
  }

  return <ToolBoard side={<div className="erp-tool-result" role="status">
    <p className="erp-tool-result__label">Ảnh ghép</p>
    <p className="erp-tool-result__value">{files.length ? `${files.length} ảnh` : '—'}</p>
    <p className="erp-tool-result__note">{message || 'Ảnh được xếp theo thứ tự chọn, cắt vừa ô vuông và xuất PNG. Metadata của ảnh gốc không được giữ.'}</p>
    <Button disabled={busy || files.length < 2 || files.length > 9} onClick={() => void process()} className="mt-3">{busy ? 'Đang ghép…' : 'Ghép và tải ảnh'}</Button>
  </div>}>
    <ToolPanel title="Ảnh cần ghép">
      <label className="erp-flow-field__label">Chọn từ 2 đến 9 ảnh
        <Form.Control type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFiles([...(event.target as HTMLInputElement).files ?? []]); setMessage('') }} />
      </label>
      {files.length ? <ol className="mt-3">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ol> : null}
      <div className="erp-tool-form__grid mt-3">
        <label className="erp-flow-field__label">Số cột
          <Form.Select value={columns} onChange={(event) => setColumns(Number(event.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></Form.Select>
        </label>
        <label className="erp-flow-field__label">Khoảng cách (px)
          <Form.Control type="number" min="0" max="100" value={gap} onChange={(event) => setGap(Number(event.target.value))} />
        </label>
      </div>
    </ToolPanel>
  </ToolBoard>
}
