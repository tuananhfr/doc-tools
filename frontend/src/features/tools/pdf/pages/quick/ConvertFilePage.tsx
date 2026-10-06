import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { convertTask, type ConvertTarget } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

const TARGETS: FlowChoiceOption<ConvertTarget>[] = [
  { value: 'word', label: 'Word (.docx)' },
  { value: 'excel', label: 'Excel (.xlsx) — Beta', hint: 'Bảng đơn giản ra đúng; bố cục phức tạp chỉ gần đúng.' },
  { value: 'jpeg', label: 'Ảnh JPG', hint: 'Mỗi trang một ảnh, tệp nhẹ.' },
  { value: 'png', label: 'Ảnh PNG', hint: 'Mỗi trang một ảnh, chữ nét hơn.' },
]

const DPI_OPTIONS = [
  { value: 96, label: '96 DPI', hint: 'Xem trên màn hình, tệp nhẹ nhất.' },
  { value: 150, label: '150 DPI', hint: 'Cân bằng độ nét và dung lượng.' },
  { value: 300, label: '300 DPI', hint: 'Đủ nét để in.' },
]

/** CHUYỂN ĐỔI FILE — PDF sang Word, Excel hoặc ảnh từng trang. */
export default function ConvertFilePage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [target, setTarget] = useState<ConvertTarget>('word')
  const [dpi, setDpi] = useState(150)
  const [ocr, setOcr] = useState(true)
  const image = target === 'jpeg' || target === 'png'

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle="Chọn tệp PDF cần chuyển đổi"
      runLabel="Chuyển đổi"
      runIcon="arrow-left-right"
      blocked={null}
      task={() => convertTask(quick.items, target, dpi, ocr)}
      options={
        <>
          <FlowChoice legend="Chuyển sang" value={target} options={TARGETS} onChange={setTarget} />
          {image ? (
            <Form.Group controlId={`${ids}-dpi`} className="erp-flow-field">
              <Form.Label className="erp-flow-field__label">Độ phân giải</Form.Label>
              <Form.Select value={dpi} aria-describedby={`${ids}-dpi-help`} onChange={(event) => setDpi(Number(event.target.value))}>
                {DPI_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Text id={`${ids}-dpi-help`} className="erp-flow-field__hint">
                {DPI_OPTIONS.find((option) => option.value === dpi)?.hint}
              </Form.Text>
            </Form.Group>
          ) : (
            <>
              <Form.Check id={`${ids}-ocr`} type="checkbox" label="Nhận dạng chữ trên trang scan (OCR tiếng Việt)" checked={ocr} aria-describedby={`${ids}-ocr-help`} onChange={(event) => setOcr(event.target.checked)} />
              <p id={`${ids}-ocr-help`} className="erp-flow-field__hint">
                {ocr
                  ? 'Lần đầu tải bộ nhận dạng khoảng 1,4 MB, mỗi trang scan mất vài giây. Trang scan chỉ giữ lại chữ, không giữ hình, dấu, chữ ký.'
                  : 'Trang scan sẽ được chèn vào Word dạng ảnh, để trống trong Excel.'}
              </p>
              <p className="erp-flow-field__hint">Dựng lại từ chữ trong PDF, bố cục phức tạp có thể lệch.</p>
            </>
          )}
        </>
      }
    />
  )
}
