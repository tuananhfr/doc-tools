import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { PdfQuickStudio } from '../../components/quick/PdfQuickStudio'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { mergeTask } from '../../services/quick-tasks'
import { PihQuickSampleButton } from '@/features/tools/pih-templates/components/PihQuickSampleButton'
import { createPihBrochurePages } from '@/features/tools/pih-templates/generators/pih-pdf-samples'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** GHÉP PDF — nhiều tệp PDF, xếp thứ tự, ra một tệp. */
export default function MergePdfPage() {
  const { t } = useTranslation('pdf')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.merge' })
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const count = quick.items.length

  return (
    <PdfQuickStudio kind="merge"><div className="cn-pdf-quick-workspace cn-merge-workspace">
    <QuickToolShell
      automatic
      pdfStudio="merge"
      quick={quick}
      accept={ACCEPT}
      multiple
      reorder
      pickerTitle={t('merge.pickerTitle')}
      runLabel={count > 1 ? t('merge.runMany', { count }) : t('merge.run')}
      runIcon="files"
      blocked={count < 2 ? t('merge.blocked') : null}
      task={() => mergeTask(quick.items)}
      pickerExtra={addFiles => <PihQuickSampleButton visible={count === 0} generate={createPihBrochurePages} onPick={addFiles} />}
      sideIntro={<div className="cn-merge-summary"><span className="cn-studio-small-icon"><Icon name="files" /></span><h2>{studio('summaryTitle')}</h2><p>{studio('summaryHint')}</p><dl><div><dt>{studio('files')}</dt><dd>{count}</dd></div><div><dt>{studio('pages')}</dt><dd>{quick.items.reduce((total, item) => total + item.pages.length, 0)}</dd></div></dl><p className="cn-merge-order"><Icon name="arrow-down-up" />{studio('orderHint')}</p></div>}
    />
    </div></PdfQuickStudio>
  )
}
