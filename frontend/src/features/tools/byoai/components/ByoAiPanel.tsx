import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { parseAiProposal } from '../utils/ai-result'
import { buildPromptPackage, promptText, redactPromptText } from '../utils/prompt-package'
import { withBase } from '@/utils/url'

interface Props { toolId: string; domain: string; snapshot?: string | null; checkedAt?: string | null; jurisdiction?: string | null; sources?: string[]; currentResult?: string }

export function ByoAiPanel({ toolId, domain, snapshot = null, checkedAt = null, jurisdiction = null, sources = [], currentResult = '' }: Props) {
  const { t } = useTranslation('byoai')
  const [open, setOpen] = useState(false)
  const [includeResult, setIncludeResult] = useState(false)
  const [aiText, setAiText] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState('')
  const packageText = useMemo(() => promptText(buildPromptPackage({ toolId, snapshot, checkedAt, jurisdiction, sources, context: currentResult, includeContext: includeResult })), [toolId, snapshot, checkedAt, jurisdiction, sources, currentResult, includeResult])
  const proposal = useMemo(() => parseAiProposal(aiText), [aiText])
  const toggle = (index: number) => setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])
  const submit = async () => {
    if (!proposal || !selected.length || !consent) return
    const changes = proposal.changes.filter((_, index) => selected.includes(index))
    if (redactPromptText(JSON.stringify(changes)) !== JSON.stringify(changes)) { setMessage(t('panel.hasSecrets')); return }
    try {
      const response = await fetch(withBase('/api/v1/contributions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolId, domain, baseSnapshotId: snapshot, proposedChanges: changes, sourceRefs: proposal.sources, jurisdiction }) })
      const body = await response.json() as { ok?: boolean; receiptCode?: string; message?: string }
      if (!response.ok || !body.ok || !body.receiptCode) { setMessage(body.message || t('panel.sendFailed')); return }
      setReceipt(body.receiptCode)
      setMessage(t('panel.sent'))
    } catch { setMessage(t('panel.offline')) }
  }
  return <section className="erp-tool-panel mt-4">
    <Button variant="outline-secondary" onClick={() => setOpen((current) => !current)}>{open ? t('panel.close') : t('panel.open')}</Button>
    {open ? <div className="mt-3">
      <p>{t('panel.intro')}</p>
      <Form.Check label={t('panel.includeResult')} checked={includeResult} onChange={(event) => setIncludeResult(event.target.checked)} />
      <label className="erp-flow-field__label mt-3">{t('panel.packageLabel')}<Form.Control as="textarea" rows={12} readOnly value={packageText} /></label>
      <Button className="mt-3" onClick={() => void navigator.clipboard.writeText(packageText).then(() => setMessage(t('shared.copied'))).catch(() => setMessage(t('panel.copyFailed')))}>{t('shared.copyPrompt')}</Button>
      <h3 className="h6 mt-4">{t('panel.pasteTitle')}</h3>
      <label className="erp-flow-field__label">{t('panel.aiJson')}<Form.Control as="textarea" rows={7} maxLength={100000} value={aiText} onChange={(event) => { setAiText(event.target.value); setSelected([]); setReceipt('') }} /></label>
      {aiText && !proposal ? <p role="alert" className="mt-2">{t('panel.invalidJson')}</p> : null}
      {proposal ? <><p className="mt-3">{t('panel.unverified')}</p>
        <div className="table-responsive"><table className="table table-sm"><thead><tr><th>{t('panel.columns.select')}</th><th>{t('panel.columns.field')}</th><th>{t('panel.columns.current')}</th><th>{t('panel.columns.proposed')}</th></tr></thead><tbody>{proposal.changes.map((change, index) => <tr key={index}><td><Form.Check aria-label={t('panel.selectField', { field: change.field })} checked={selected.includes(index)} onChange={() => toggle(index)} /></td><td>{change.field}</td><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table></div>
        <p>{t('panel.sources', { sources: proposal.sources.length ? proposal.sources.map((source) => `${source.type}: ${source.url}`).join('; ') : t('panel.noSources') })}</p>
        {proposal.uncertainties.length ? <p>{t('panel.uncertainties', { items: proposal.uncertainties.join('; ') })}</p> : null}
        <Form.Check label={t('panel.consent')} checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <Button className="mt-3" disabled={!selected.length || !consent || Boolean(receipt)} onClick={() => void submit()}>{t('panel.submit')}</Button>
      </> : null}
      {message ? <p role="status" className="mt-3">{message}</p> : null}
      {receipt ? <p><strong>{t('panel.receipt')}</strong> <code>{receipt}</code></p> : null}
    </div> : null}
  </section>
}
