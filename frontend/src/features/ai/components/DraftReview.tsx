import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { dateTimeFormat } from '@/i18n/intl'
import { useRemoveDraft, useSubmitDraft } from '../hooks/useContributionDrafts'
import { AiError } from '../services/ai.service'
import type { ContributionDraft } from '../types/ai.types'

const DATE_OPTIONS = { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' } as const
const MY_CONTRIBUTIONS_PATH = '/de-xuat-cua-toi'

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function ErrorLine({ error }: { error: unknown }) {
  const { t } = useTranslation('ai')
  if (!error) return null
  const code = error instanceof AiError ? error.code : 'UNKNOWN'
  return <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" /><span>{t(`errors.${code}`)}</span></p>
}

function DraftCard({ draft, onSent }: { draft: ContributionDraft; onSent: () => void }) {
  const { t } = useTranslation('ai')
  const submit = useSubmitDraft(draft.toolId)
  const remove = useRemoveDraft(draft.toolId)
  // Nothing is ticked up front: each row is something the person checked against the source.
  const [picked, setPicked] = useState<number[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [attribution, setAttribution] = useState(false)
  const busy = submit.isPending || remove.isPending
  const toggle = (index: number) => setPicked((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])
  const headingId = `cn-ai-draft-${draft.id}`

  const send = () => {
    if (!picked.length || !confirmed) return
    submit.mutate({ id: draft.id, selectedIndexes: picked, attribution }, { onSuccess: onSent })
  }
  const discard = () => {
    if (window.confirm(t('drafts.removeConfirm'))) remove.mutate(draft.id)
  }

  return (
    <article className="cn-ai-draft" aria-labelledby={headingId}>
      <header className="cn-ai-draft__head">
        <h4 id={headingId}>{t('drafts.createdAt', { date: dateTimeFormat(DATE_OPTIONS).format(new Date(draft.createdAt * 1000)) })}</h4>
        <button type="button" className="cn-link-button" disabled={busy} onClick={discard}><Icon name="trash3" />{t('drafts.remove')}</button>
      </header>

      <ul className="cn-ai-changes">
        {draft.changes.map((change, index) => (
          <li key={`${change.field}-${index}`}>
            <label className={`cn-ai-change${picked.includes(index) ? ' is-picked' : ''}`}>
              <input type="checkbox" className="form-check-input" checked={picked.includes(index)} disabled={busy} onChange={() => toggle(index)} aria-label={t('drafts.pick', { field: change.field })} />
              <code className="cn-ai-change__field">{change.field}</code>
              <span className="cn-ai-change__values">
                <span className="cn-ai-change__before"><span className="visually-hidden">{t('drafts.current')}: </span>{change.before}</span>
                <Icon name="arrow-right" />
                <span className="cn-ai-change__after"><span className="visually-hidden">{t('drafts.proposed')}: </span>{change.after}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {draft.sources.length ? (
        <div className="cn-ai-draft__block">
          <h5>{t('drafts.sources')}</h5>
          <ul className="cn-ai-draft__sources">
            {draft.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer nofollow"><Icon name="box-arrow-up-right" />{hostOf(source.url)}</a>
                <span className="cn-ai-draft__tag">{t(`drafts.sourceType.${source.type}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.uncertainties.length ? (
        <div className="cn-ai-draft__block is-warn">
          <h5><Icon name="question-circle" />{t('drafts.uncertainties')}</h5>
          <ul>{draft.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      ) : null}

      <div className="cn-ai-draft__send">
        <label className="form-check">
          <input type="checkbox" className="form-check-input" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />
          <span className="form-check-label">{t('drafts.confirm')}</span>
        </label>
        <label className="form-check">
          <input type="checkbox" className="form-check-input" checked={attribution} disabled={busy} onChange={(event) => setAttribution(event.target.checked)} />
          <span className="form-check-label">{t('drafts.attribution')}</span>
        </label>
        <ErrorLine error={submit.error ?? remove.error} />
        <button type="button" className="cn-button" disabled={busy || !picked.length || !confirmed} onClick={send}>
          <Icon name="send-check" />{submit.isPending ? t('drafts.submitting') : picked.length ? t('drafts.submit', { selected: String(picked.length) }) : t('drafts.submitNone')}
        </button>
      </div>
    </article>
  )
}

/** The agent's drafts for one tool; sending is the person's act, never the agent's. */
export function DraftReview({ drafts, failed, onRetry }: { drafts: ContributionDraft[]; failed: boolean; onRetry: () => void }) {
  const { t } = useTranslation('ai')
  const [sent, setSent] = useState(false)
  if (failed) {
    return (
      <p className="cn-form-error" role="alert">
        <Icon name="exclamation-circle" /><span>{t('drafts.loadFailed')}</span>
        <button type="button" className="cn-link-button" onClick={onRetry}>{t('chat.retry')}</button>
      </p>
    )
  }
  if (!drafts.length && !sent) return null
  return (
    <section className="cn-ai-drafts" aria-labelledby="cn-ai-drafts-title">
      {drafts.length ? (
        <>
          <div className="cn-ai-drafts__head">
            <h3 id="cn-ai-drafts-title">{t('drafts.title')} <span className="cn-ai-drafts__count">{drafts.length}</span></h3>
            <p><Icon name="exclamation-triangle" />{t('drafts.hint')}</p>
          </div>
          {drafts.map((draft) => <DraftCard key={draft.id} draft={draft} onSent={() => setSent(true)} />)}
        </>
      ) : <h3 id="cn-ai-drafts-title" className="visually-hidden">{t('drafts.title')}</h3>}
      {sent ? (
        <p className="cn-ai-drafts__sent" role="status">
          <Icon name="check2-circle" />{t('drafts.sent')} <Link to={MY_CONTRIBUTIONS_PATH}>{t('drafts.sentLink')}</Link>
        </p>
      ) : null}
    </section>
  )
}
