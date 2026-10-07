import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { CONTRIBUTION_STATUSES, ContributionStatusBadge, type ContributionStatus } from '@/features/account'
import type { ToolDefinition } from '@/features/tools/hub'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'
import { useSourceCheckHistory } from '../hooks/useSavedItems'
import { CloudError } from '../services/cloud.service'
import type { DraftState } from '../types/cloud.types'
import { savedStamp } from '../utils/saved-format'

const MY_CONTRIBUTIONS_PATH = '/de-xuat-cua-toi'
const DRAFT_ICON: Record<DraftState, string> = { none: 'dash-circle', open: 'pencil-square', submitted: 'send-check', discarded: 'x-circle' }
const isStatus = (value: string | null): value is ContributionStatus => (CONTRIBUTION_STATUSES as readonly (string | null)[]).includes(value)

/** What was checked and what came of it; the questions themselves were never stored. */
export function SourceCheckHistory({ catalog }: { catalog: readonly ToolDefinition[] }) {
  const { t } = useTranslation('cloud')
  const history = useSourceCheckHistory(true)
  const items = history.data?.pages.flatMap((page) => page.items) ?? []

  if (history.isError && !items.length) {
    return <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${history.error instanceof CloudError ? history.error.code : 'UNKNOWN'}`)}</p>
  }
  if (!history.data) return <Skeleton rows={3} />
  if (!items.length) return <p className="cn-saved-empty">{t('history.empty')}</p>

  return (
    <>
      <ol className="cn-saved-list">
        {items.map((entry) => {
          const tool = findToolBySlug(entry.toolId, catalog)
          return (
            <li key={entry.id} className="cn-saved-row">
              <span className="cn-saved-row__icon"><Icon name={tool?.icon ?? 'shield-check'} /></span>
              <div className="cn-saved-row__text">
                <strong>{tool?.name ?? entry.toolId}</strong>
                <span>{savedStamp(entry.createdAt)} · {entry.baseSnapshotId ? t('history.withPackage') : t('history.withoutPackage')}</span>
              </div>
              <div className="cn-saved-row__status">
                <span className={`cn-saved-draft is-${entry.draft}`}><Icon name={DRAFT_ICON[entry.draft]} />{t(`history.draft.${entry.draft}`)}</span>
                {entry.draft === 'submitted' && isStatus(entry.contributionStatus) ? (
                  <Link to={MY_CONTRIBUTIONS_PATH} className="cn-saved-row__link"><ContributionStatusBadge status={entry.contributionStatus} /></Link>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      {history.hasNextPage ? (
        <button type="button" className="cn-button cn-button--ghost cn-saved-more" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
          <Icon name="chevron-down" />{history.isFetchingNextPage ? t('history.loading') : t('history.more')}
        </button>
      ) : null}
    </>
  )
}
