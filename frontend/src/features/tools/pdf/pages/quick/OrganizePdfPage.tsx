import { useTranslation } from 'react-i18next'
import { ToolLeaveGuard } from '@/features/tools/hub'
import { OrganizeStage } from '../../components/quick/OrganizeStage'
import { QuickToolShell } from '../../components/quick/QuickToolShell'
import { useOrganizePages } from '../../hooks/useOrganizePages'
import { useQuickSources, type QuickKind } from '../../hooks/useQuickSources'
import { organizeTask } from '../../services/page-tasks'

const ACCEPT: readonly QuickKind[] = ['pdf']

/** SẮP XẾP PDF — dời, xoay, bỏ từng trang; thả thêm tệp thì trang của nó nối vào cuối lưới. */
export default function OrganizePdfPage() {
  const { t } = useTranslation('pdf')
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
    <>
      {/* Thứ tự đã sắp chỉ nằm trong RAM: rời màn là phải sắp lại từ đầu. */}
      <ToolLeaveGuard active={quick.items.length > 0 && !organize.untouched} />
      <QuickToolShell
        quick={quick}
        accept={ACCEPT}
        multiple
        pickerTitle={t('organize.pickerTitle')}
        stage={(running) => <OrganizeStage items={quick.items} organize={organize} disabled={running} onClear={quick.clear} />}
        runLabel={count > 0 ? t('shared.createPdfPages', { count }) : t('shared.createPdf')}
        runIcon="check2-circle"
        blocked={blocked}
        task={() => organizeTask(quick.items, organize.pages)}
      />
    </>
  )
}
