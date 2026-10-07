import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { dateTimeFormat } from '@/i18n/intl'
import type { MyContribution } from '../types/account.types'
import { ContributionStatusBadge } from './ContributionStatusBadge'
import { EvidenceForm } from './EvidenceForm'

const DATE_OPTIONS = { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' } as const

// Ideas and regulation notes are free text in `after`; rule edits read as "field: before → after".
const changeText = (change: MyContribution['changes'][number]) => change.before ? `${change.field}: ${change.before} → ${change.after}` : change.after

interface Props { item: MyContribution; toolName: string | null }

export function MyContributionItem({ item, toolName }: Props) {
  const { t } = useTranslation('account')
  const { t: tCommunity } = useTranslation('community')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const more = item.changeCount - item.changes.length
  const headingId = `cn-contribution-${item.id}`

  return (
    <article className="cn-contribution" aria-labelledby={headingId}>
      <div className="cn-contribution__head">
        <ContributionStatusBadge status={item.status} />
        <time className="cn-contribution__date" dateTime={item.createdAt}>{dateTimeFormat(DATE_OPTIONS).format(new Date(item.createdAt))}</time>
      </div>
      <h3 id={headingId} className="cn-contribution__tool">
        {toolName ? <Link to={`/${item.toolId}`}>{toolName}</Link> : item.toolId}
      </h3>
      <div className="cn-contribution__changes">
        {item.changes.map((change, index) => <p key={index}>{changeText(change)}</p>)}
        {more > 0 ? <p className="cn-contribution__more">{t('mine.moreChanges', { more })}</p> : null}
      </div>
      <div className="cn-contribution__sources">
        <span className="cn-contribution__label">{t('mine.sources')}</span>
        {item.sourceRefs.length ? (
          <ul>
            {item.sourceRefs.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.url}</a>
                <span className="cn-contribution__source-type">{tCommunity(`contribution.sourceTypes.${source.type}`)}</span>
              </li>
            ))}
          </ul>
        ) : <span className="cn-contribution__none">{t('mine.noSources')}</span>}
      </div>
      {item.status === 'NEEDS_SOURCE' && !adding ? <p className="cn-contribution__hint"><Icon name="info-circle" />{t('mine.needsSourceHint')}</p> : null}
      {added && !adding ? <p className="cn-form-notice" role="status"><Icon name="check2" />{t('mine.evidence.added')}</p> : null}
      {adding ? (
        <EvidenceForm contributionId={item.id} onDone={() => setAdding(false)} onAdded={() => setAdded(true)} />
      ) : (
        <div className="cn-contribution__foot">
          {item.attribution ? <span className="cn-contribution__flag"><Icon name="person-check" />{t('mine.attributed')}</span> : <span className="cn-contribution__flag"><Icon name="incognito" />{t('mine.unattributed')}</span>}
          {item.canAddEvidence ? (
            <button type="button" className="cn-button cn-button--ghost cn-contribution__add" onClick={() => { setAdded(false); setAdding(true) }}>
              <Icon name="link-45deg" />{t('mine.addEvidence')}
            </button>
          ) : null}
        </div>
      )}
    </article>
  )
}
