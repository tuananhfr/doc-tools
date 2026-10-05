import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { CopyButton, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { removeVietnameseMarks, tcvn3ToUnicode, vniToUnicode } from '../utils/legacy-font'

type Conversion = 'tcvn3' | 'tcvn3-upper' | 'vni' | 'nfc' | 'strip' | 'lower' | 'upper'

export default function LegacyFontPage() {
  const inputId = useId()
  const [input, setInput] = useState('')
  const [conversion, setConversion] = useState<Conversion>('tcvn3')
  const output = ({
    tcvn3: () => tcvn3ToUnicode(input),
    'tcvn3-upper': () => tcvn3ToUnicode(input, true),
    vni: () => vniToUnicode(input),
    nfc: () => input.normalize('NFC'),
    strip: () => removeVietnameseMarks(input),
    lower: () => input.toLowerCase(),
    upper: () => input.toUpperCase(),
  })[conversion]()

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">Văn bản sau chuyển đổi</p>
    <p className="erp-qr-payload" aria-live="polite">{output || '—'}</p>
    {output ? <CopyButton text={output} label="Chép văn bản" /> : null}
    <p className="erp-tool-result__note mt-3">Chọn đúng bảng mã của văn bản gốc; tên font hiển thị không tự xác định được mã ký tự.</p>
  </div>}>
    <ToolPanel title="Văn bản gốc">
      <label className="erp-flow-field__label">Kiểu chuyển đổi
        <Form.Select value={conversion} onChange={(event) => setConversion(event.target.value as Conversion)}>
          <option value="tcvn3">TCVN3 (ABC) → Unicode</option>
          <option value="tcvn3-upper">TCVN3 chữ hoa → Unicode</option>
          <option value="vni">VNI-Windows → Unicode</option>
          <option value="nfc">Gộp dấu Unicode (NFC)</option>
          <option value="strip">Bỏ dấu tiếng Việt</option>
          <option value="lower">Chữ thường</option>
          <option value="upper">CHỮ HOA</option>
        </Form.Select>
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={inputId}>Nội dung</label>
      <Form.Control id={inputId} as="textarea" rows={12} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Dán văn bản cần chuyển đổi…" />
    </ToolPanel>
  </ToolBoard>
}
