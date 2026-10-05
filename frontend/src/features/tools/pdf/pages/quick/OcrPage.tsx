import { useState } from 'react'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { ocrTask, type OcrOutput } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf', 'image']

const OUTPUTS: FlowChoiceOption<OcrOutput>[] = [
  { value: 'pdf', label: 'PDF tìm được chữ', hint: 'Hình trang giữ nguyên; tìm, bôi chọn, chép được chữ.' },
  { value: 'text', label: 'Văn bản (.txt)', hint: 'Chỉ lấy chữ, xem và sao chép ngay.' },
]

/** OCR VĂN BẢN — nhận dạng chữ tiếng Việt trên bản scan, ảnh chụp. */
export default function OcrPage() {
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [output, setOutput] = useState<OcrOutput>('pdf')

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle="Chọn bản scan hoặc ảnh cần nhận dạng chữ"
      runLabel="Nhận dạng chữ"
      runIcon="textarea-t"
      blocked={null}
      task={() => ocrTask(quick.items, output)}
      options={
        <>
          <FlowChoice legend="Kết quả" value={output} options={OUTPUTS} onChange={setOutput} />
          <p className="erp-flow-field__hint">Nhận dạng tiếng Việt ngay trên máy. Lần đầu cần mạng để tải bộ nhận dạng; mỗi trang mất vài giây.</p>
        </>
      }
    />
  )
}
