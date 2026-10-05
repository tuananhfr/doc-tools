import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { mergeTask } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** GHÉP PDF — nhiều tệp PDF, xếp thứ tự, ra một tệp. */
export default function MergePdfPage() {
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const count = quick.items.length

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle="Chọn các tệp PDF cần ghép"
      runLabel={count > 1 ? `Ghép ${count} tệp` : 'Ghép PDF'}
      runIcon="files"
      blocked={count < 2 ? 'Cần ít nhất 2 tệp PDF để ghép.' : null}
      task={() => mergeTask(quick.items)}
    />
  )
}
