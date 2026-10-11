import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContributionStatus } from '@/features/account/types/account.types'
import { addReceiptSource, lookupReceipt } from '../services/contributions.api'
import type { ContributionReceipt, SourceType } from '../types/community.types'
import { checkSourceUrl } from '../utils/contribution-check'
import { SourceFields } from './SourceFields'
import { useFormReady } from '../hooks/useFormReady'

export function ReceiptTracker({ initial }: { initial?: ContributionReceipt | null }) {
  const { t } = useTranslation('community')
  const id = useId()
  const ready = useFormReady()
  const [code, setCode] = useState(initial?.receiptCode ?? '')
  const [verified, setVerified] = useState<{ code: string; status: ContributionStatus } | null>(initial ? { code: initial.receiptCode, status: initial.status } : null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<SourceType>('OFFICIAL_WEB')
  const pending = useRef<AbortController | null>(null)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++; pending.current?.abort() }, [])
  const changeCode = (value: string) => {
    generation.current++; pending.current?.abort(); setBusy(false)
    setCode(value); setVerified(null); setMessage(''); setUrl('')
  }
  const check = async (event: FormEvent) => {
    event.preventDefault()
    const receiptCode = code.trim()
    if (!/^[A-Za-z0-9_-]{32}$/.test(receiptCode)) { setVerified(null); setMessage(t('contribution.invalidReceipt')); return }
    pending.current?.abort()
    const controller = new AbortController(); pending.current = controller
    const version = ++generation.current
    setBusy(true); setVerified(null); setMessage('')
    try {
      const result = await lookupReceipt(receiptCode, controller.signal)
      if (version !== generation.current) return
      setVerified(result.contribution ? { code: receiptCode, status: result.contribution.status } : null)
      setMessage(result.contribution ? '' : t('contribution.receiptNotFound'))
    } catch { if (version === generation.current) setMessage(t('contribution.lookupFailed')) }
    finally { if (version === generation.current) setBusy(false) }
  }
  const addSource = async (event: FormEvent) => {
    event.preventDefault()
    if (!verified || verified.code !== code.trim() || busy || !url.trim() || checkSourceUrl(url.trim()) !== 'ok') return
    const controller = new AbortController(); pending.current = controller
    const version = ++generation.current
    setBusy(true); setMessage('')
    try {
      const result = await addReceiptSource(verified.code, { url: url.trim(), type }, controller.signal)
      if (version !== generation.current) return
      setVerified({ code: verified.code, status: result.status }); setMessage(t('contribution.sourceAdded')); setUrl('')
    } catch { if (version === generation.current) setMessage(t('contribution.addSourceFailed')) }
    finally { if (version === generation.current) setBusy(false) }
  }
  const canAdd = verified && verified.code === code.trim() && ['NEEDS_SOURCE', 'NEEDS_REVIEW'].includes(verified.status)
  return <section className="cn-community-tracker" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}>{t('contribution.lookupTitle')}</h2>
    <form onSubmit={event => void check(event)} className="cn-community-lookup">
      <label htmlFor={`${id}-code`}>{t('contribution.receiptLabel')}<input id={`${id}-code`} disabled={!ready} value={code} maxLength={64} onChange={event => changeCode(event.target.value)} autoComplete="off" spellCheck={false} /></label>
      <button type="submit" className="cn-button cn-button--ghost" disabled={!ready || busy}>{t('contribution.lookup')}</button>
    </form>
    {verified ? <p role="status">{t('contribution.statusLine', { status: t(`contribution.status.${verified.status}`) })}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {canAdd ? <form onSubmit={event => void addSource(event)} className="cn-community-form"><p className="cn-field-help">{t('feedback.addEvidenceHint')}</p><SourceFields url={url} type={type} onUrl={setUrl} onType={setType} required /><button type="submit" className="cn-button cn-button--ghost" disabled={busy || !url.trim() || checkSourceUrl(url.trim()) !== 'ok'}>{t('contribution.addSource')}</button></form> : null}
  </section>
}
