import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { withBase } from '@/utils/url'

interface Props { mode: 'idea' | 'regulation' }
const statusLabels: Record<string, string> = { NEEDS_SOURCE: 'Cần bổ sung nguồn', NEEDS_REVIEW: 'Đang chờ kiểm tra', VERIFIED: 'Đã xác minh', REJECTED: 'Không được chấp nhận', APPROVED: 'Đã phê duyệt', PUBLISHED: 'Đã công bố', SUPERSEDED: 'Đã có bản mới', REVOKED: 'Đã thu hồi' }

export function ContributionForm({ mode }: Props) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceType, setSourceType] = useState<'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER'>('OFFICIAL_WEB')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [lookup, setLookup] = useState('')
  const [message, setMessage] = useState('')
  const [lookupMessage, setLookupMessage] = useState('')
  const [lookupStatus, setLookupStatus] = useState('')
  const submit = async () => {
    if (!consent || !detail.trim() || busy) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch(withBase('/api/v1/contributions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        toolId: mode === 'idea' ? 'de-xuat-tien-ich' : 'gop-y-quy-dinh', domain: mode === 'idea' ? 'ideas' : 'legal',
        baseSnapshotId: null, jurisdiction: mode === 'idea' ? null : 'VN',
        proposedChanges: [{ field: mode === 'idea' ? 'idea' : 'rule', before: '', after: `${title.trim()}\n${detail.trim()}`.trim() }],
        sourceRefs: sourceUrl.trim() ? [{ url: sourceUrl.trim(), type: sourceType }] : [],
      }) })
      const value = await response.json() as { ok?: boolean; receiptCode?: string; status?: string; message?: string }
      if (!response.ok || !value.ok || !value.receiptCode) { setMessage(value.message || 'Không gửi được đề xuất.'); return }
      setReceipt(value.receiptCode); setLookup(value.receiptCode)
      setMessage(`Đã nhận đề xuất: ${statusLabels[value.status || ''] || value.status}. Hãy giữ mã biên nhận để theo dõi.`)
    } catch { setMessage('Không kết nối được máy chủ. Nội dung vẫn ở trang này.') }
    finally { setBusy(false) }
  }
  const check = async () => {
    if (!/^[A-Za-z0-9_-]{32}$/.test(lookup)) { setLookupMessage('Mã biên nhận không hợp lệ.'); return }
    try {
      const response = await fetch(withBase(`/api/v1/contributions/receipt/${lookup}`), { cache: 'no-store' })
      const value = await response.json() as { contribution?: { status: string } | null }
      setLookupStatus(value.contribution?.status || '')
      setLookupMessage(value.contribution ? `Trạng thái: ${statusLabels[value.contribution.status] || value.contribution.status}` : 'Không tìm thấy mã biên nhận.')
    } catch { setLookupMessage('Không tra được trạng thái lúc này.') }
  }
  const addSource = async () => {
    try {
      const response = await fetch(withBase(`/api/v1/contributions/receipt/${lookup}/sources`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceRefs: [{ url: sourceUrl.trim(), type: sourceType }] }) })
      const value = await response.json() as { ok?: boolean; message?: string }
      if (!response.ok || !value.ok) { setLookupMessage(value.message || 'Không bổ sung được nguồn.'); return }
      setLookupStatus('NEEDS_REVIEW'); setLookupMessage('Đã bổ sung nguồn. Đề xuất đang chờ kiểm tra.')
    } catch { setLookupMessage('Không kết nối được máy chủ.') }
  }
  return <div className="erp-tool-panel">
    <h2 className="h5">{mode === 'idea' ? 'Đề xuất tiện ích' : 'Góp ý dữ liệu quy định'}</h2>
    <p>{mode === 'idea' ? 'Mô tả vấn đề thực tế và công cụ bạn muốn có. Ý tưởng cần được kiểm tra trước khi công bố.' : 'Nêu nội dung cần sửa và đường dẫn nguồn. Đây là góp ý để người phụ trách kiểm tra, chưa thay đổi dữ liệu công cụ.'}</p>
    <label className="erp-flow-field__label mt-3">{mode === 'idea' ? 'Tên ý tưởng' : 'Văn bản hoặc chủ đề'}<Form.Control maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="erp-flow-field__label mt-3">{mode === 'idea' ? 'Vấn đề và cách giải quyết đề xuất' : 'Nội dung cần đối chiếu / điều chỉnh'}<Form.Control as="textarea" rows={6} maxLength={4800} value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
    {mode === 'regulation' ? <><label className="erp-flow-field__label mt-3">URL nguồn HTTPS (nếu có)<Form.Control type="url" maxLength={2048} value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label><label className="erp-flow-field__label mt-3">Loại nguồn bạn đề xuất<Form.Select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}><option value="OFFICIAL_WEB">Trang cơ quan</option><option value="OFFICIAL_DOCUMENT">Văn bản chính thức</option><option value="OFFICIAL_API">API chính thức</option><option value="OTHER">Nguồn khác</option></Form.Select></label></> : null}
    <Form.Check className="mt-3" checked={consent} onChange={(event) => setConsent(event.target.checked)} label="Tôi đã bỏ thông tin cá nhân, khóa bí mật và đồng ý gửi nội dung này để người vận hành kiểm tra" />
    <Button className="mt-3" disabled={!consent || !title.trim() || !detail.trim() || busy || Boolean(receipt)} onClick={() => void submit()}>{busy ? 'Đang gửi…' : 'Gửi đề xuất'}</Button>
    {message ? <p role="status" className="mt-3">{message}</p> : null}
    {receipt ? <p><strong>Mã biên nhận:</strong> <code>{receipt}</code></p> : null}
    <hr />
    <h3 className="h6">Tra trạng thái</h3><div className="d-flex flex-wrap gap-2"><Form.Control style={{ maxWidth: 340 }} aria-label="Mã biên nhận" maxLength={32} value={lookup} onChange={(event) => setLookup(event.target.value)} /><Button variant="outline-secondary" onClick={() => void check()}>Tra cứu</Button></div>
    {lookupMessage ? <p role="status" className="mt-2">{lookupMessage}</p> : null}
    {mode === 'regulation' && lookupStatus === 'NEEDS_SOURCE' ? <><p>Nhập URL HTTPS ở ô nguồn phía trên, rồi bổ sung bằng mã biên nhận này.</p><Button variant="outline-primary" disabled={!sourceUrl.trim()} onClick={() => void addSource()}>Bổ sung nguồn</Button></> : null}
  </div>
}
