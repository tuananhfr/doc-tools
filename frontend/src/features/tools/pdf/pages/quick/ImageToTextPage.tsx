import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { ocrTask } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['image']

/** ẢNH → VĂN BẢN — lấy chữ tiếng Việt từ ảnh chụp, xem và sao chép ngay. */
export default function ImageToTextPage() {
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle="Chọn ảnh cần lấy chữ"
      runLabel="Lấy chữ"
      runIcon="card-text"
      blocked={null}
      task={() => ocrTask(quick.items, 'text')}
    />
  )
}
