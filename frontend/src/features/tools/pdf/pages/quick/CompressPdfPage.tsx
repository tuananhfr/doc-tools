import { useState } from 'react'
import { FlowChoice, type FlowChoiceOption } from '@/features/tools/hub'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { compressTask } from '../../services/quick-tasks'
import type { Compression } from '../../utils/compression'

const ACCEPT: readonly QuickKind[] = ['pdf']

type Level = Exclude<Compression, 'none'>

const LEVELS: FlowChoiceOption<Level>[] = [
  { value: 'medium', label: 'Vừa', hint: 'Ảnh vẫn đủ nét để in A4.' },
  { value: 'strong', label: 'Mạnh', hint: 'Tệp nhẹ nhất — hợp gửi email, xem trên màn hình.' },
]

/** NÉN PDF — nén lại ảnh JPEG trong tệp; chữ và ảnh PNG giữ nguyên. */
export default function CompressPdfPage() {
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const [level, setLevel] = useState<Level>('medium')
  const count = quick.items.length

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      pickerTitle="Chọn tệp PDF cần nén"
      runLabel={count > 1 ? `Nén ${count} tệp` : 'Nén PDF'}
      runIcon="file-earmark-zip"
      blocked={null}
      task={() => compressTask(quick.items, level)}
      options={
        <>
          <FlowChoice legend="Mức nén" value={level} options={LEVELS} onChange={setLevel} />
          <p className="erp-flow-field__hint">Chỉ nén ảnh chụp, ảnh scan trong tệp. Tệp toàn chữ thường không nhỏ hơn được.</p>
        </>
      }
    />
  )
}
