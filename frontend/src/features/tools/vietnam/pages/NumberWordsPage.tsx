import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { numberToVietnameseWords } from '../utils/number-words'

export default function NumberWordsPage() {
  const inputId = useId()
  const [input, setInput] = useState('')
  const [zeroWord, setZeroWord] = useState<'linh' | 'lẻ'>('linh')
  const [fourWord, setFourWord] = useState<'bốn' | 'tư'>('bốn')
  const words = input ? numberToVietnameseWords(input, { zeroWord, fourWord }) : null

  return (
    <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
      <p className="erp-tool-result__label">Bằng chữ</p>
      <p className="erp-tool-result__value">{words ?? '—'}</p>
      <p className="erp-tool-result__note">{words === null && input ? 'Chỉ nhập số nguyên, tối đa 36 chữ số.' : 'Đọc số cho chứng từ và hợp đồng; hãy kiểm tra quy ước của nơi tiếp nhận.'}</p>
      {words ? <CopyButton text={words} label="Chép kết quả" /> : null}
    </div>}>
      <ToolPanel title="Số cần đọc">
        <label className="erp-flow-field__label" htmlFor={inputId}>Số nguyên</label>
        <Form.Control id={inputId} inputMode="numeric" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ví dụ: 1.234.567" />
        <div className="erp-tool-form__grid mt-3">
          <label className="erp-flow-field__label">Số không ở hàng chục
            <Form.Select value={zeroWord} onChange={(event) => setZeroWord(event.target.value as 'linh' | 'lẻ')}>
              <option value="linh">Linh</option><option value="lẻ">Lẻ</option>
            </Form.Select>
          </label>
          <label className="erp-flow-field__label">Số bốn sau hàng chục
            <Form.Select value={fourWord} onChange={(event) => setFourWord(event.target.value as 'bốn' | 'tư')}>
              <option value="bốn">Bốn</option><option value="tư">Tư</option>
            </Form.Select>
          </label>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
