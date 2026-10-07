import { useTranslation } from 'react-i18next'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { mergeTask } from '../../services/quick-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** GHÉP PDF — nhiều tệp PDF, xếp thứ tự, ra một tệp. */
export default function MergePdfPage() {
  const { t } = useTranslation('pdf')
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const count = quick.items.length

  return (
    <QuickToolShell
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle={t('merge.pickerTitle')}
      runLabel={count > 1 ? t('merge.runMany', { count }) : t('merge.run')}
      runIcon="files"
      blocked={count < 2 ? t('merge.blocked') : null}
      task={() => mergeTask(quick.items)}
    />
  )
}
