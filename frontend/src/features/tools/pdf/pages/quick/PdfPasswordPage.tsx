import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { protectPdf, removePdfPassword } from '../../services/pdf-password'

export default function PdfPasswordPage() {
  const [mode, setMode] = useState<'protect' | 'remove'>('protect')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [owner, setOwner] = useState('')
  const [printing, setPrinting] = useState(true)
  const [copying, setCopying] = useState(true)
  const [modifying, setModifying] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const restricted = !printing || !copying || !modifying
  const run = async () => {
    if (!file || busy) return
    if (mode === 'protect' && password !== repeat) { setMessage('Hai mật khẩu mở tệp chưa khớp.'); return }
    setBusy(true)
    setMessage('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const output = mode === 'protect'
        ? await protectPdf(bytes, password, owner, { printing, copying, modifying })
        : await removePdfPassword(bytes, password)
      downloadOutput({ name: `${file.name.replace(/\.pdf$/i, '')}-${mode === 'protect' ? 'co-mat-khau' : 'da-mo-khoa'}.pdf`, blob: new Blob([output], { type: 'application/pdf' }) })
      setMessage('Đã tạo tệp PDF mới. Hãy thử mở tệp đã tải để kiểm tra.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không xử lý được PDF.') }
    finally { setBusy(false) }
  }
  return <ToolBoard side={<div className="erp-tool-result" role="status"><p className="erp-tool-result__label">Kết quả</p><p className="erp-tool-result__value">{file?.name || 'Chưa chọn tệp'}</p><p className="erp-tool-result__note">{message || 'Tệp được xử lý trong trình duyệt. Mật khẩu chỉ tồn tại trong phiên này.'}</p><Button disabled={!file || busy} onClick={() => void run()}>{busy ? 'Đang xử lý…' : mode === 'protect' ? 'Đặt mật khẩu và tải về' : 'Gỡ mật khẩu và tải về'}</Button></div>}>
    <ToolPanel title="Mật khẩu PDF">
      <Form.Select aria-label="Chế độ" value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setMessage('') }}><option value="protect">Đặt mật khẩu</option><option value="remove">Gỡ mật khẩu</option></Form.Select>
      <label className="erp-flow-field__label mt-3">Chọn tệp PDF<Form.Control type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile((event.target as HTMLInputElement).files?.[0] || null); setMessage('') }} /></label>
      <label className="erp-flow-field__label mt-3">{mode === 'protect' ? 'Mật khẩu mở tệp' : 'Mật khẩu được cấp để mở tệp'}<Form.Control type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {mode === 'protect' ? <><label className="erp-flow-field__label mt-3">Nhập lại mật khẩu<Form.Control type="password" autoComplete="off" value={repeat} onChange={(event) => setRepeat(event.target.value)} /></label>
        <div className="mt-3"><Form.Check label="Cho phép in" checked={printing} onChange={(event) => setPrinting(event.target.checked)} /><Form.Check label="Cho phép sao chép nội dung" checked={copying} onChange={(event) => setCopying(event.target.checked)} /><Form.Check label="Cho phép chỉnh sửa" checked={modifying} onChange={(event) => setModifying(event.target.checked)} /></div>
        {restricted ? <label className="erp-flow-field__label mt-3">Mật khẩu quản lý riêng (cần giữ để gỡ giới hạn)<Form.Control type="password" autoComplete="off" value={owner} onChange={(event) => setOwner(event.target.value)} /></label> : null}
        <p className="mt-3">Nếu quên mật khẩu sẽ không thể khôi phục bằng công cụ này. Hãy gửi mật khẩu qua kênh khác với tệp.</p></> : <p className="mt-3">Chỉ gỡ khóa cho tệp bạn sở hữu hoặc được phép xử lý. Với tệp hạn chế quyền, cần mật khẩu quản lý.</p>}
    </ToolPanel>
  </ToolBoard>
}
