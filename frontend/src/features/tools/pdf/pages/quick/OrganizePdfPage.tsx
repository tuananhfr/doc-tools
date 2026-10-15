import { useTranslation } from 'react-i18next'
import { ToolLeaveGuard, WorkspaceGuide } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { OrganizeStage } from '../../components/quick/OrganizeStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useOrganizePages } from '../../hooks/useOrganizePages'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { organizeTask } from '../../services/page-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** SẮP XẾP PDF — dời, xoay, bỏ từng trang; thả thêm tệp thì trang của nó nối vào cuối lưới. */
export default function OrganizePdfPage() {
  const { t } = useTranslation('pdf')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.organize' })
  const quick = useQuickSources({ accept: ACCEPT, multiple: true })
  const organize = useOrganizePages(quick.items)
  const count = organize.pages.length

  const blocked =
    count === 0
      ? t('organize.blockedEmpty')
      : organize.untouched && quick.items.length === 1
        ? t('organize.blockedUntouched')
        : null

  return (
    <div className="cn-pdf-quick-workspace cn-organize-workspace">
      {/* Thứ tự đã sắp chỉ nằm trong RAM: rời màn là phải sắp lại từ đầu. */}
      <ToolLeaveGuard active={quick.items.length > 0 && !organize.untouched} />
      <QuickToolShell
        quick={quick}
        accept={ACCEPT}
        multiple
        pickerTitle={t('organize.pickerTitle')}
        stage={quick.items.length ? (running) => <OrganizeStage items={quick.items} organize={organize} disabled={running} onClear={quick.clear} /> : undefined}
        sideIntro={<div className="cn-merge-summary cn-organize-summary"><span className="cn-studio-small-icon"><Icon name="grid-3x3-gap" /></span><h2>{studio('summaryTitle')}</h2><p>{studio('summaryHint')}</p><dl><div><dt>{studio('files')}</dt><dd>{quick.items.length}</dd></div><div><dt>{studio('pages')}</dt><dd>{count}</dd></div></dl><p className="cn-organize-summary-hint"><Icon name="hand-index" />{studio('controlsHint')}</p></div>}
        runLabel={count > 0 ? t('shared.createPdfPages', { count }) : t('shared.createPdf')}
        runIcon="check2-circle"
        blocked={blocked}
        task={() => organizeTask(quick.items, organize.pages)}
      />
      <div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('stepChoose'), studio('stepArrange'), studio('stepSave')]} tip={studio('tip', { reset: t('organizeStage.reset') })} /></div>
    </div>
  )
}
