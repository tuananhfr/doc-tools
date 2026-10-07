import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { exportFamilyIcs, parseFamilyBackup } from '../core/portability'
import type { FamilySpace } from '../core/family'

interface Props { space: FamilySpace; onRestore: (value: FamilySpace) => Promise<void>; onPrint: (includeSensitive: boolean) => void; disabled: boolean }

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function FamilyPortability({ space, onRestore, onPrint, disabled }: Props) {
  const { t } = useTranslation('family')
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const [candidate, setCandidate] = useState<FamilySpace | null>(null)
  const [error, setError] = useState('')
  const inspect = async (file: File | undefined) => {
    setCandidate(null)
    if (!file || file.size > 20_000_000) { setError(t('backup.invalidFile')); return }
    const parsed = parseFamilyBackup(await file.text())
    if (!parsed) { setError(t('backup.wrongVersion')); return }
    setCandidate(parsed); setError('')
  }
  const restore = async () => {
    if (!candidate || !window.confirm(t('backup.confirmRestore', { id: candidate.familyId, count: candidate.events.length }))) return
    try { await onRestore(candidate); setCandidate(null); setError('') }
    catch { setError(t('backup.restoreFailed')) }
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">{t('backup.title')}</h2>
    <p>{t('backup.intro')}</p>
    <div className="d-flex flex-wrap gap-2"><Button variant="outline-secondary" onClick={() => download(JSON.stringify(space, null, 2), 'application/json;charset=utf-8', `${t('file.backup')}.json`)}>{t('backup.downloadBackup')}</Button><Button variant="outline-secondary" onClick={() => download(exportFamilyIcs(space, includeSensitive), 'text/calendar;charset=utf-8', `${t('file.ics')}.ics`)}>{t('backup.downloadIcs')}</Button><Button variant="outline-secondary" onClick={() => onPrint(includeSensitive)}>{t('backup.print')}</Button></div>
    <Form.Check className="mt-3" label={t('backup.includeSensitive')} checked={includeSensitive} onChange={(event) => setIncludeSensitive(event.target.checked)} />
    <p className="small">{t('backup.defaultsNote')}</p>
    <label className="erp-flow-field__label mt-3">{t('backup.restoreLabel')}<Form.Control type="file" accept=".json,application/json" onChange={(event) => void inspect((event.target as HTMLInputElement).files?.[0])} /></label>
    {candidate ? <div className="mt-3"><p>{t('backup.inspected', { members: candidate.members.length, events: candidate.events.length, reminders: candidate.reminders.length, id: candidate.familyId })}</p><Button disabled={disabled} onClick={() => void restore()}>{t('backup.restoreThis')}</Button></div> : null}
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>
}
