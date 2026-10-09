import { useEffect, useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { dateTimeFormat } from '@/i18n/intl'
import { exportFamilyIcs, parseFamilyBackup } from '../core/portability'
import type { FamilySpace } from '../core/family'
import { listFamilySpaces } from '../storage/family-store'

interface Props { space: FamilySpace; onRestore: (value: FamilySpace) => Promise<void>; onPrint: (includeSensitive: boolean) => void; disabled: boolean }

// Lần mở đầu có thể dựng hai không gian trống cùng lúc (hai tab, effect chạy lại) — chúng không mang dữ liệu gì, đừng liệt kê.
const holdsData = (space: FamilySpace) => space.events.length > 0 || space.reminders.length > 0 || space.emergencyContacts.length > 0 || space.sosQueue.length > 0 || space.members.length > 1

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function FamilyPortability({ space, onRestore, onPrint, disabled }: Props) {
  const { t } = useTranslation('family')
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const id = useId()
  const [candidate, setCandidate] = useState<{ space: FamilySpace; dropped: number } | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<FamilySpace[]>([])
  useEffect(() => {
    let mounted = true
    void listFamilySpaces().then((items) => { if (mounted) setSaved(items.filter((item) => item.familyId !== space.familyId && holdsData(item)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) }).catch(() => undefined)
    return () => { mounted = false }
  }, [space.familyId])
  const inspect = async (file: File | undefined) => {
    setCandidate(null)
    if (!file || file.size > 20_000_000) { setError(t('backup.invalidFile')); return }
    const parsed = parseFamilyBackup(await file.text())
    if (!parsed) { setError(t('backup.wrongVersion')); return }
    setCandidate(parsed); setError('')
  }
  const restore = async () => {
    if (!candidate || !window.confirm(t('backup.confirmRestore', { id: candidate.space.familyId, count: candidate.space.events.length }))) return
    try { await onRestore(candidate.space); setCandidate(null); setError('') }
    catch { setError(t('backup.restoreFailed')) }
  }
  const open = async (version: FamilySpace) => {
    if (!window.confirm(t('backup.confirmOpenSaved', { total: version.events.length }))) return
    try { await onRestore(version) } catch { setError(t('backup.restoreFailed')) }
  }
  return <section className="erp-tool-panel">
    <h2 className="h5">{t('backup.title')}</h2>
    <p>{t('backup.intro')}</p>
    <div className="d-flex flex-wrap gap-2"><Button variant="outline-secondary" onClick={() => download(JSON.stringify(space, null, 2), 'application/json;charset=utf-8', `${t('file.backup')}.json`)}>{t('backup.downloadBackup')}</Button><Button variant="outline-secondary" onClick={() => download(exportFamilyIcs(space, includeSensitive), 'text/calendar;charset=utf-8', `${t('file.ics')}.ics`)}>{t('backup.downloadIcs')}</Button><Button variant="outline-secondary" onClick={() => onPrint(includeSensitive)}>{t('backup.print')}</Button></div>
    <Form.Check className="mt-3" id={`${id}-sensitive`} label={t('backup.includeSensitive')} checked={includeSensitive} onChange={(event) => setIncludeSensitive(event.target.checked)} />
    <p className="small">{t('backup.defaultsNote')}</p>
    <label className="erp-flow-field__label mt-3">{t('backup.restoreLabel')}<Form.Control type="file" accept=".json,application/json" onChange={(event) => void inspect((event.target as HTMLInputElement).files?.[0])} /></label>
    {candidate ? <div className="mt-3"><p>{t('backup.inspected', { members: candidate.space.members.length, events: candidate.space.events.length, reminders: candidate.space.reminders.length, id: candidate.space.familyId })}</p>
      {candidate.dropped ? <p role="alert">{t('backup.droppedItems', { total: candidate.dropped })}</p> : null}
      <Button disabled={disabled} onClick={() => void restore()}>{t('backup.restoreThis')}</Button></div> : null}
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
    <h3 className="h6 mt-4">{t('backup.savedTitle')}</h3>
    {saved.length ? <ul className="list-unstyled">{saved.map((version) => <li key={version.familyId} className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 border-bottom">
      <span>{t('backup.savedItem', { date: dateTimeFormat({ dateStyle: 'short', timeStyle: 'short' }).format(new Date(version.updatedAt)), members: version.members.length, events: version.events.length })}</span>
      <Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => void open(version)}>{t('backup.openSaved')}</Button>
    </li>)}</ul> : <p className="small">{t('backup.savedEmpty')}</p>}
  </section>
}
