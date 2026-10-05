import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { convertTask } from '../../services/quick-tasks'
import type { ImageFormat } from '../../types/doc-tools.types'

const ACCEPT: readonly QuickKind[] = ['pdf']

const FORMATS: FlowChoiceOption<ImageFormat>[] = [
  { value: 'jpeg', label: 'JPG', hint: 'Tệp nhẹ, hợp để gửi qua tin nhắn.' },
  { value: 'png', label: 'PNG', hint: 'Chữ và nét vẽ sắc hơn, tệp nặng hơn.' },
]

const DPI_OPTIONS = [
  { value: 96, label: '96 DPI', hint: 'Xem trên màn hình, tệp nhẹ nhất.' },
  { value: 150, label: '150 DPI', hint: 'Cân bằng độ nét và dung lượng.' },
  { value: 300, label: '300 DPI', hint: 'Đủ nét để in.' },
]

/** PDF → ẢNH — mỗi trang một ảnh; nhiều trang hoặc nhiều tệp thì gói chung một .zip. */
export default function PdfToImagePage() {
  const ids = useId()
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [format, setFormat] = useState<ImageFormat>('jpeg')
  const [dpi, setDpi] = useState(150)
  const pages = quick.items.reduce((sum, item) => sum + item.pages.length, 0)

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle="Chọn tệp PDF cần chuyển thành ảnh"
      runLabel={pages > 1 ? `Xuất ${pages} ảnh` : 'Xuất ảnh'}
      runIcon="image"
      blocked={null}
      task={() => convertTask(quick.items, format, dpi)}
      options={
        <>
          <FlowChoice legend="Định dạng ảnh" value={format} options={FORMATS} onChange={setFormat} />
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
        </>
      }
    />
  )
}
