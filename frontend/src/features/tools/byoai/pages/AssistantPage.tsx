import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { withBase } from '@/utils/url'
import { assistantMatches, assistantPrompt } from '../utils/assistant-prompt'

export default function AssistantPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('')
  const matches = useMemo(() => assistantMatches(TOOL_CATALOG, question), [question])
  const prompt = useMemo(() => assistantPrompt(question, matches), [question, matches])
  return <ToolBoard side={<div className="erp-tool-result"><p className="erp-tool-result__label">Gợi ý trên máy</p><p className="erp-tool-result__note">Nhập việc cần làm để tìm công cụ phù hợp. Nếu muốn nhờ AI diễn giải, xem trước đúng nội dung rồi tự sao chép sang dịch vụ bạn chọn.</p>{matches.length ? <ul className="list-unstyled">{matches.map((tool) => <li className="mb-3" key={tool.id}><a href={withBase(`/${tool.slug}`)}>{tool.name}</a><div>{tool.description}</div></li>)}</ul> : <p>Chưa tìm thấy công cụ khớp rõ ràng.</p>}</div>}>
    <ToolPanel title="Trợ lý chọn công cụ">
      <label className="erp-flow-field__label">Bạn muốn làm gì?<Form.Control as="textarea" rows={4} maxLength={4000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ví dụ: Tôi muốn gộp hai tệp PDF và đánh số trang" /></label>
      {question.trim() ? <><p className="mt-3">Câu hỏi dưới đây sẽ chỉ được sao chép khi bạn bấm nút. Email, token và URL nội bộ được che tự động; hãy tự xem lại trước khi đưa cho AI.</p><label className="erp-flow-field__label">Nội dung gửi AI<Form.Control as="textarea" rows={12} readOnly value={prompt} /></label><Button className="mt-3" onClick={() => void navigator.clipboard.writeText(prompt).then(() => setMessage('Đã sao chép câu hỏi.')).catch(() => setMessage('Không sao chép được; hãy chọn văn bản và sao chép thủ công.'))}>Sao chép câu hỏi</Button></> : null}
      {message ? <p role="status" className="mt-2">{message}</p> : null}
      <label className="erp-flow-field__label mt-4">Dán câu trả lời AI để đọc ở đây (không lưu hoặc gửi cho Chuyện Nhỏ)<Form.Control as="textarea" rows={7} maxLength={20000} value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>
      {answer ? <div className="erp-tool-panel mt-3" style={{ whiteSpace: 'pre-wrap' }}><strong>Nội dung chưa xác minh</strong><p>{answer}</p></div> : null}
    </ToolPanel>
  </ToolBoard>
}
