import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { inspectLink, inspectMessage } from '../utils/message-risk'

export default function MessageRiskPage() {
  const inputId = useId()
  const [kind, setKind] = useState<'message' | 'link'>('message')
  const [input, setInput] = useState('')
  const risk = input.trim() ? kind === 'link' ? inspectLink(input) : inspectMessage(input) : null
  const label = risk?.level === 'high' ? 'Nhiều dấu hiệu cần kiểm tra' : risk?.level === 'medium' ? 'Có dấu hiệu cần kiểm tra' : risk ? 'Chưa thấy dấu hiệu trong bộ quy tắc' : '—'

  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">Kết quả sàng lọc</p>
    <p className="erp-tool-result__value">{label}</p>
    {risk?.flags.length ? <ul className="erp-tool-rows">{risk.flags.map((flag, index) => <li key={`${flag}-${index}`}>{flag}</li>)}</ul> : null}
    <p className="erp-tool-result__note">Đây chỉ là kiểm tra dấu hiệu bằng quy tắc, không chứng minh đường dẫn hay tin nhắn an toàn. Không nhập OTP hoặc mật khẩu vào trang mở từ tin nhắn; liên hệ tổ chức qua kênh bạn tự tìm.</p>
  </div>}>
    <ToolPanel title="Nội dung cần kiểm tra">
      <label className="erp-flow-field__label">Loại nội dung
        <Form.Select value={kind} onChange={(event) => setKind(event.target.value as 'message' | 'link')}><option value="message">Tin nhắn</option><option value="link">Đường dẫn</option></Form.Select>
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={inputId}>{kind === 'link' ? 'Đường dẫn' : 'Nội dung tin nhắn'}</label>
      <Form.Control id={inputId} as="textarea" rows={10} value={input} onChange={(event) => setInput(event.target.value)} placeholder={kind === 'link' ? 'Dán đường dẫn, không cần mở…' : 'Dán tin nhắn nghi ngờ…'} />
      <p className="erp-tool-result__note mt-3">Nội dung được phân tích trên máy; công cụ không truy cập đường dẫn bạn dán.</p>
    </ToolPanel>
  </ToolBoard>
}
