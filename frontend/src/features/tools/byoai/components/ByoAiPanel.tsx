import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { parseAiProposal } from '../utils/ai-result'
import { buildPromptPackage, promptText, redactPromptText } from '../utils/prompt-package'
import { withBase } from '@/utils/url'

interface Props { toolId: string; domain: string; snapshot?: string | null; checkedAt?: string | null; jurisdiction?: string | null; sources?: string[]; currentResult?: string }

export function ByoAiPanel({ toolId, domain, snapshot = null, checkedAt = null, jurisdiction = null, sources = [], currentResult = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [includeResult, setIncludeResult] = useState(false)
  const [aiText, setAiText] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState('')
  const packageText = useMemo(() => promptText(buildPromptPackage({ toolId, snapshot, checkedAt, jurisdiction, sources, context: currentResult, includeContext: includeResult })), [toolId, snapshot, checkedAt, jurisdiction, sources, currentResult, includeResult])
  const proposal = useMemo(() => parseAiProposal(aiText), [aiText])
  const toggle = (index: number) => setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])
  const submit = async () => {
    if (!proposal || !selected.length || !consent) return
    const changes = proposal.changes.filter((_, index) => selected.includes(index))
    if (redactPromptText(JSON.stringify(changes)) !== JSON.stringify(changes)) { setMessage('Thay đổi có email, token hoặc URL nội bộ. Hãy xóa dữ liệu này trước khi gửi.'); return }
    try {
      const response = await fetch(withBase('/api/v1/contributions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolId, domain, baseSnapshotId: snapshot, proposedChanges: changes, sourceRefs: proposal.sources, jurisdiction }) })
      const body = await response.json() as { ok?: boolean; receiptCode?: string; message?: string }
      if (!response.ok || !body.ok || !body.receiptCode) { setMessage(body.message || 'Không gửi được đề xuất.'); return }
      setReceipt(body.receiptCode)
      setMessage('Đề xuất đã gửi vào hàng chờ kiểm tra nguồn. Hãy giữ mã biên nhận để xem trạng thái.')
    } catch { setMessage('Không kết nối được máy chủ. Bản nháp vẫn ở trang này.') }
  }
  return <section className="erp-tool-panel mt-4">
    <Button variant="outline-secondary" onClick={() => setOpen((current) => !current)}>{open ? 'Đóng kiểm tra nguồn' : 'Kiểm tra nguồn mới bằng AI của bạn'}</Button>
    {open ? <div className="mt-3">
      <p>Chuyện Nhỏ không gọi AI hoặc lưu khóa AI của bạn. Hãy xem đúng nội dung dưới đây trước khi sao chép sang dịch vụ AI bạn chọn. Kết quả AI chỉ là gợi ý.</p>
      <Form.Check label="Thêm kết quả đang xem vào câu hỏi (có thể chứa thông tin cá nhân)" checked={includeResult} onChange={(event) => setIncludeResult(event.target.checked)} />
      <label className="erp-flow-field__label mt-3">Nội dung sẽ sao chép<Form.Control as="textarea" rows={12} readOnly value={packageText} /></label>
      <Button className="mt-3" onClick={() => void navigator.clipboard.writeText(packageText).then(() => setMessage('Đã sao chép câu hỏi.')).catch(() => setMessage('Không sao chép được; hãy chọn và sao chép thủ công.'))}>Sao chép câu hỏi</Button>
      <h3 className="h6 mt-4">Dán kết quả AI để xem thay đổi</h3>
      <label className="erp-flow-field__label">JSON AI trả về<Form.Control as="textarea" rows={7} maxLength={100000} value={aiText} onChange={(event) => { setAiText(event.target.value); setSelected([]); setReceipt('') }} /></label>
      {aiText && !proposal ? <p role="alert" className="mt-2">JSON chưa đúng cấu trúc hoặc vượt giới hạn. Kiểm tra lại các trường changes, sources, uncertainties.</p> : null}
      {proposal ? <><p className="mt-3">Đây là dữ liệu chưa xác minh. Kiểm tra từng URL nguồn và chọn phần muốn đề xuất.</p>
        <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Chọn</th><th>Trường</th><th>Hiện tại</th><th>AI đề xuất</th></tr></thead><tbody>{proposal.changes.map((change, index) => <tr key={index}><td><Form.Check aria-label={`Chọn ${change.field}`} checked={selected.includes(index)} onChange={() => toggle(index)} /></td><td>{change.field}</td><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table></div>
        <p>Nguồn AI gợi ý (người gửi cần tự đối chiếu): {proposal.sources.length ? proposal.sources.map((source) => `${source.type}: ${source.url}`).join('; ') : 'Chưa có'}</p>
        {proposal.uncertainties.length ? <p>Điểm chưa chắc chắn: {proposal.uncertainties.join('; ')}</p> : null}
        <Form.Check label="Tôi đã xem từng thay đổi, kiểm tra dữ liệu riêng tư và đồng ý gửi nội dung đã chọn để quản trị viên xem xét" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <Button className="mt-3" disabled={!selected.length || !consent || Boolean(receipt)} onClick={() => void submit()}>Gửi đề xuất cập nhật</Button>
      </> : null}
      {message ? <p role="status" className="mt-3">{message}</p> : null}
      {receipt ? <p><strong>Mã biên nhận:</strong> <code>{receipt}</code></p> : null}
    </div> : null}
  </section>
}
