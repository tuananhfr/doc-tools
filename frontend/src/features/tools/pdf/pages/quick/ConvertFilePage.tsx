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
      task={() => convertTask(quick.items, target, dpi)}
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
            <p className="erp-flow-field__hint">Dựng lại từ chữ trong PDF — bố cục phức tạp có thể lệch. Bản scan cần chạy OCR trước.</p>
          )}
        </>
      }
    />
  )
}
