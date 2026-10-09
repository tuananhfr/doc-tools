import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { withBase } from '@/utils/url'
import { ContributionAccountBox, defaultAttribution, useMe, useRefreshMyContributions } from '@/features/account'
import { checkSourceUrl, findSensitive, SOURCE_URL_MAX, type SensitiveKind } from '../utils/contribution-check'

interface Props { mode: 'idea' | 'regulation' }
const STATUSES = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'REJECTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED'] as const
const isKnownStatus = (status: string | undefined): status is (typeof STATUSES)[number] => (STATUSES as readonly (string | undefined)[]).includes(status)

export function ContributionForm({ mode }: Props) {
  const { t } = useTranslation('community')
  const { t: tAccount } = useTranslation('account')
  const user = useMe().data?.user ?? null
  const refreshMine = useRefreshMyContributions()
  // null = not touched yet, so the default can follow the profile once `/me` answers.
  const [attributionChoice, setAttributionChoice] = useState<boolean | null>(null)
  const attribution = attributionChoice ?? (user ? defaultAttribution(user) : false)
  const [tracked, setTracked] = useState(false)
  const statusLabel = (status: string | undefined) => isKnownStatus(status) ? t(`contribution.status.${status}`) : String(status)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceType, setSourceType] = useState<'OFFICIAL_WEB' | 'OFFICIAL_DOCUMENT' | 'OFFICIAL_API' | 'OTHER'>('OFFICIAL_WEB')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [lookup, setLookup] = useState('')
  const [message, setMessage] = useState('')
  const [lookupMessage, setLookupMessage] = useState('')
  const [lookupStatus, setLookupStatus] = useState('')
  const ids = { title: useId(), detail: useId(), url: useId(), consent: useId() }
  const titleSensitive = findSensitive(title)
  const detailSensitive = findSensitive(detail)
  const urlCheck = checkSourceUrl(sourceUrl.trim())
  const urlError = urlCheck === 'invalid' ? t('contribution.sourceUrlInvalid') : urlCheck === 'notHttps' ? t('contribution.sourceUrlNotHttps') : urlCheck === 'unsafe' ? t('contribution.sourceUrlUnsafe') : ''
  const sensitiveError = (kinds: SensitiveKind[]) => kinds.length ? [...kinds.map((kind) => t(`contribution.sensitive.${kind}`)), t('contribution.sensitiveFix')].join(' ') : ''
  const blocked = Boolean(titleSensitive.length || detailSensitive.length || (mode === 'regulation' && urlError))
  const required = <span className="text-danger" aria-hidden="true"> *</span>
  const fieldError = (id: string, error: string) => error ? <span id={`${id}-error`} className="erp-tool-form__error" role="alert">{error}</span> : null
  const submit = async () => {
    if (!consent || !title.trim() || !detail.trim() || blocked || busy) return
    setBusy(true); setMessage('')
    try {
      // The header lets the backend file it under the signed-in account; without it the cookie is ignored.
      const response = await fetch(withBase('/api/v1/contributions'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify({
        toolId: mode === 'idea' ? 'de-xuat-tien-ich' : 'gop-y-quy-dinh', domain: mode === 'idea' ? 'ideas' : 'legal',
        baseSnapshotId: null, jurisdiction: mode === 'idea' ? null : 'VN',
        proposedChanges: [{ field: mode === 'idea' ? 'idea' : 'rule', before: '', after: `${title.trim()}\n${detail.trim()}`.trim() }],
        sourceRefs: sourceUrl.trim() ? [{ url: sourceUrl.trim(), type: sourceType }] : [],
        ...(user ? { attribution } : {}),
      }) })
      const value = await response.json() as { ok?: boolean; receiptCode?: string; status?: string; tracked?: boolean; message?: string }
      if (!response.ok || !value.ok || !value.receiptCode) { setMessage(value.message || t('contribution.sendFailed')); return }
      setReceipt(value.receiptCode); setLookup(value.receiptCode)
      if (value.tracked) { setTracked(true); void refreshMine() }
      setMessage(value.tracked ? tAccount('box.received', { status: statusLabel(value.status) }) : t('contribution.received', { status: statusLabel(value.status) }))
    } catch { setMessage(t('contribution.offlineDraft')) }
    finally { setBusy(false) }
  }
  const check = async () => {
    if (!/^[A-Za-z0-9_-]{32}$/.test(lookup)) { setLookupMessage(t('contribution.invalidReceipt')); return }
    try {
      const response = await fetch(withBase(`/api/v1/contributions/receipt/${lookup}`), { cache: 'no-store' })
      const value = await response.json() as { contribution?: { status: string } | null }
      setLookupStatus(value.contribution?.status || '')
      setLookupMessage(value.contribution ? t('contribution.statusLine', { status: statusLabel(value.contribution.status) }) : t('contribution.receiptNotFound'))
    } catch { setLookupMessage(t('contribution.lookupFailed')) }
  }
  const addSource = async () => {
    try {
      const response = await fetch(withBase(`/api/v1/contributions/receipt/${lookup}/sources`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceRefs: [{ url: sourceUrl.trim(), type: sourceType }] }) })
      const value = await response.json() as { ok?: boolean; message?: string }
      if (!response.ok || !value.ok) { setLookupMessage(value.message || t('contribution.addSourceFailed')); return }
      setLookupStatus('NEEDS_REVIEW'); setLookupMessage(t('contribution.sourceAdded'))
    } catch { setLookupMessage(t('contribution.offline')) }
  }
  return <div className="erp-tool-panel">
    <h2 className="h5">{mode === 'idea' ? t('contribution.ideaTitle') : t('contribution.regulationTitle')}</h2>
    <p>{mode === 'idea' ? t('contribution.ideaIntro') : t('contribution.regulationIntro')}</p>
    <p className="erp-flow-field__hint">{t('contribution.requiredNote')}</p>
    <label className="erp-flow-field__label mt-3" htmlFor={ids.title}>{mode === 'idea' ? t('contribution.ideaName') : t('contribution.regulationTopic')}{required}<Form.Control id={ids.title} required aria-required="true" maxLength={100} value={title} isInvalid={titleSensitive.length > 0} aria-describedby={titleSensitive.length ? `${ids.title}-error` : undefined} onChange={(event) => setTitle(event.target.value)} />{fieldError(ids.title, sensitiveError(titleSensitive))}</label>
    <label className="erp-flow-field__label mt-3" htmlFor={ids.detail}>{mode === 'idea' ? t('contribution.ideaDetail') : t('contribution.regulationDetail')}{required}<Form.Control id={ids.detail} as="textarea" rows={6} required aria-required="true" maxLength={4800} value={detail} isInvalid={detailSensitive.length > 0} aria-describedby={detailSensitive.length ? `${ids.detail}-error` : undefined} onChange={(event) => setDetail(event.target.value)} />{fieldError(ids.detail, sensitiveError(detailSensitive))}</label>
    {mode === 'regulation' ? <><label className="erp-flow-field__label mt-3" htmlFor={ids.url}>{t('contribution.sourceUrl')}<Form.Control id={ids.url} type="url" maxLength={SOURCE_URL_MAX} value={sourceUrl} isInvalid={Boolean(urlError)} aria-describedby={urlError ? `${ids.url}-error` : undefined} onChange={(event) => setSourceUrl(event.target.value)} />{fieldError(ids.url, urlError)}</label><label className="erp-flow-field__label mt-3">{t('contribution.sourceType')}<Form.Select value={sourceType} onChange={(event) => setSourceType(event.target.value as typeof sourceType)}><option value="OFFICIAL_WEB">{t('contribution.sourceTypes.OFFICIAL_WEB')}</option><option value="OFFICIAL_DOCUMENT">{t('contribution.sourceTypes.OFFICIAL_DOCUMENT')}</option><option value="OFFICIAL_API">{t('contribution.sourceTypes.OFFICIAL_API')}</option><option value="OTHER">{t('contribution.sourceTypes.OTHER')}</option></Form.Select></label></> : null}
    {user ? <ContributionAccountBox user={user} attribution={attribution} onAttributionChange={setAttributionChoice} tracked={tracked} /> : null}
    <Form.Check className="mt-3" id={ids.consent} required aria-required="true" checked={consent} onChange={(event) => setConsent(event.target.checked)} label={<>{t('contribution.consent')}{required}</>} />
    <Button className="mt-3" disabled={!consent || !title.trim() || !detail.trim() || blocked || busy || Boolean(receipt)} onClick={() => void submit()}>{busy ? t('contribution.sending') : t('contribution.submit')}</Button>
    {message ? <p role="status" className="mt-3">{message}</p> : null}
    {receipt ? <p><strong>{t('contribution.receipt')}</strong> <code>{receipt}</code></p> : null}
    <hr />
    <h3 className="h6">{t('contribution.lookupTitle')}</h3><div className="d-flex flex-wrap gap-2"><Form.Control style={{ maxWidth: 340 }} aria-label={t('contribution.receiptLabel')} maxLength={32} value={lookup} onChange={(event) => setLookup(event.target.value)} /><Button variant="outline-secondary" onClick={() => void check()}>{t('contribution.lookup')}</Button></div>
    {lookupMessage ? <p role="status" className="mt-2">{lookupMessage}</p> : null}
    {mode === 'regulation' && lookupStatus === 'NEEDS_SOURCE' ? <><p>{t('contribution.needsSource')}</p><Button variant="outline-primary" disabled={!sourceUrl.trim() || urlCheck !== 'ok'} onClick={() => void addSource()}>{t('contribution.addSource')}</Button></> : null}
  </div>
}
