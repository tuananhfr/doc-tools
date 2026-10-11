import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMe } from '@/features/account'
import { ContributionAccountBox, defaultAttribution } from '@/features/account/components/ContributionAccountBox'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { useContributionSubmit } from '../hooks/useContributionSubmit'
import { useFormReady } from '../hooks/useFormReady'
import type { FeedbackCategory, SourceType, ToolContext } from '../types/community.types'
import { findSensitive, checkSourceUrl } from '../utils/contribution-check'
import { contributionPayload } from '../utils/contribution-payload'
import { SourceFields } from './SourceFields'
import { ReceiptTracker } from './ReceiptTracker'

export function ContributionForm({ mode, context }: { mode: 'idea' | 'feedback'; context?: ToolContext }) {
  const { t } = useTranslation('community')
  const id = useId()
  const user = useMe().data?.user
  const tools = useToolCatalog().filter(tool => tool.status === 'ready')
  const submission = useContributionSubmit()
  const ready = useFormReady()
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [toolSlug, setToolSlug] = useState('')
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('OFFICIAL_WEB')
  const [consent, setConsent] = useState(false)
  const [attributionChoice, setAttributionChoice] = useState<boolean | null>(null)
  const attribution = attributionChoice ?? (user ? defaultAttribution(user) : false)
  const isData = mode === 'feedback' && category === 'data'
  const sensitiveError = (value: string) => {
    const kinds = findSensitive(value)
    return kinds.length ? [...kinds.map(kind => t(`contribution.sensitive.${kind}`)), t('contribution.sensitiveFix')].join(' ') : ''
  }
  const titleError = sensitiveError(title)
  const detailError = sensitiveError(detail)
  const blocked = !consent || !title.trim() || !detail.trim() || Boolean(titleError || detailError) || (isData && checkSourceUrl(sourceUrl.trim()) !== 'ok')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (blocked || submission.busy) return
    void submission.submit(contributionPayload({ mode, category, toolSlug: context?.toolSlug ?? toolSlug, title, detail, source: sourceUrl.trim() ? { url: sourceUrl.trim(), type: sourceType } : null, attribution }))
  }
  const reset = () => {
    setTitle(''); setDetail(''); setSourceUrl(''); setConsent(false)
    submission.reset()
    requestAnimationFrame(() => document.getElementById(`${id}-title`)?.focus())
  }
  const saveReceipt = () => {
    if (!submission.receipt) return
    const url = URL.createObjectURL(new Blob([submission.receipt.receiptCode], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'chuyen-nho-receipt.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const field = (name: 'title' | 'detail', label: string, value: string, onChange: (value: string) => void, error: string) => <div className="cn-community-field">
    <label htmlFor={`${id}-${name}`}>{label}<span className="cn-community-required" aria-hidden="true"> *</span></label>
    {name === 'detail' ? <textarea id={`${id}-${name}`} rows={5} required maxLength={4800} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${name}-error` : undefined} /> : <input id={`${id}-${name}`} required maxLength={100} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${name}-error` : undefined} />}
    {error ? <p id={`${id}-${name}-error`} className="cn-field-error" role="alert">{error}</p> : null}
  </div>
  return <div className="cn-community-composer">
    {submission.receipt ? <section className="cn-community-success" aria-labelledby={`${id}-success`}>
      <h2 id={`${id}-success`}>{t('feedback.thanks')}</h2>
      <p role="status">{t('contribution.received', { status: t(`contribution.status.${submission.receipt.status}`) })}</p>
      <label htmlFor={`${id}-receipt`}>{t('contribution.receipt')}<input id={`${id}-receipt`} readOnly value={submission.receipt.receiptCode} onFocus={event => event.target.select()} /></label>
      {submission.receipt.tracked ? <p><Link to="/de-xuat-cua-toi">{t('feedback.accountTracking')}</Link></p> : null}
      <div className="cn-community-actions"><button type="button" className="cn-button cn-button--ghost" onClick={saveReceipt}>{t('feedback.saveReceipt')}</button><button type="button" className="cn-button" onClick={reset}>{t(mode === 'idea' ? 'feedback.newIdea' : 'feedback.newFeedback')}</button></div>
      <ReceiptTracker initial={submission.receipt} />
    </section> : <form className="cn-community-form" onSubmit={submit}><fieldset className="cn-community-form-fields" disabled={!ready || submission.busy}>
      {context ? <p className="cn-community-context">{t('feedback.forTool', { name: context.toolName })}</p> : null}
      <p className="cn-field-help">{t('feedback.privacy')}{' '}{t('contribution.requiredNote')}</p>
      {mode === 'feedback' ? <>
        <fieldset className="cn-community-category"><legend>{t('feedback.category')}</legend><div>{(['bug', 'improvement', 'data'] as const).map(value => <label key={value} className={category === value ? 'is-selected' : undefined}><input type="radio" name={`${id}-category`} checked={category === value} onChange={() => setCategory(value)} /><span>{t(`feedback.categories.${value}`)}</span></label>)}</div></fieldset>
        {!context ? <label htmlFor={`${id}-tool`}>{t('feedback.tool')}<select id={`${id}-tool`} value={toolSlug} onChange={event => setToolSlug(event.target.value)}><option value="">{t('feedback.wholeSite')}</option>{tools.map(tool => <option key={tool.slug} value={tool.slug}>{tool.name}</option>)}</select></label> : null}
      </> : null}
      {field('title', t(mode === 'idea' ? 'feedback.ideaProblem' : 'feedback.subject'), title, setTitle, titleError)}
      {field('detail', t(mode === 'idea' ? 'feedback.ideaExample' : 'feedback.detail'), detail, setDetail, detailError)}
      {isData ? <><p className="cn-field-help">{t('feedback.dataHint')}</p><SourceFields url={sourceUrl} type={sourceType} onUrl={setSourceUrl} onType={setSourceType} /></> : null}
      {user && mode === 'idea' ? <ContributionAccountBox user={user} attribution={attribution} onAttributionChange={setAttributionChoice} tracked={false} /> : user ? <p className="cn-field-help">{t('feedback.accountTracking')}</p> : null}
      <label className="cn-community-consent"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t('contribution.consent')}</span></label>
      <button type="submit" className="cn-button" disabled={blocked || submission.busy}>{submission.busy ? t('contribution.sending') : t(mode === 'idea' ? 'contribution.submit' : 'feedback.submit')}</button>
      {submission.failed ? <p className="cn-field-error" role="alert">{t(submission.failed === 'DUPLICATE_CONTRIBUTION' ? 'feedback.duplicate' : submission.failed === 'RATE_LIMITED' ? 'feedback.rateLimited' : 'feedback.sendFailed')}</p> : null}
    </fieldset></form>}
  </div>
}
