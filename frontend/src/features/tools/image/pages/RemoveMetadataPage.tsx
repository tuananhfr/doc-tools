import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { removeImageMetadata } from '../services/remove-metadata'

export default function RemoveMetadataPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const process = async () => {
    if (!file || busy) return
    setBusy(true)
    setMessage('')
    try {
      const output = await removeImageMetadata(file)
      downloadOutput({ name: `${file.name.replace(/\.[^.]+$/, '')}-khong-exif.${output.extension}`, blob: output.blob })
      setMessage(`Đã tạo ảnh ${output.width} × ${output.height} và tải về. Kiểm tra ảnh trước khi chia sẻ.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xử lý được ảnh.')
    } finally {
      setBusy(false)
    }
  }

  return <ToolBoard side={<div className="erp-tool-result" role="status">
    <p className="erp-tool-result__label">Tệp đầu ra</p>
    <p className="erp-tool-result__value">{file ? file.name : '—'}</p>
    <p className="erp-tool-result__note">{message || 'Vẽ lại ảnh trên máy để bỏ EXIF gốc, gồm vị trí GPS, máy ảnh và ngày chụp. Ảnh JPG được mã hóa lại nên chất lượng có thể thay đổi.'}</p>
    <Button disabled={!file || busy} onClick={() => void process()} className="mt-3">{busy ? 'Đang xử lý…' : 'Xóa EXIF và tải ảnh'}</Button>
  </div>}>
    <ToolPanel title="Ảnh cần làm sạch">
      <label className="erp-flow-field__label">Chọn ảnh JPG, PNG hoặc WebP
        <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setFile((event.target as HTMLInputElement).files?.[0] ?? null); setMessage('') }} />
      </label>
      <p className="erp-tool-result__note mt-3">Công cụ này chủ động bỏ EXIF. Các công cụ ảnh khác vẫn giữ thông tin hiện trường theo lựa chọn hiện tại của dự án.</p>
    </ToolPanel>
  </ToolBoard>
}
