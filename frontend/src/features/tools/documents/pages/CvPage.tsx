import { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { PrintPortal, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { CvPreview } from '../components/CvPreview'
import { emptyCv, emptyEntry, parseCvDraft, type CvDraft, type CvEntry } from '../models/cv'

const storageKey = 'chuyen-nho-cv-draft-v1'
const identityFields = ['name', 'role', 'phone', 'email', 'location', 'link'] as const

function EntryEditor({ kind, entries, onChange }: { kind: 'experience' | 'education'; entries: CvEntry[]; onChange: (entries: CvEntry[]) => void }) {
  const { t } = useTranslation('documents')
  const update = (index: number, key: keyof CvEntry, value: string) => onChange(entries.map((entry, position) => position === index ? { ...entry, [key]: value } : entry))
  return <fieldset className="mt-4"><legend className="h6">{t(`cv.sections.${kind}`)}</legend>{entries.map((entry, index) => <div className="border rounded p-3 mb-3" key={index}>
    {([['period', t('cv.entry.period')], ['organization', kind === 'experience' ? t('cv.entry.company') : t('cv.entry.school')], ['title', kind === 'experience' ? t('cv.entry.position') : t('cv.entry.degree')]] as const).map(([key, label]) => <label className="erp-flow-field__label mb-2" key={key}>{label}<Form.Control value={entry[key]} maxLength={200} onChange={(event) => update(index, key, event.target.value)} /></label>)}
    <label className="erp-flow-field__label">{t('cv.entry.description')}<Form.Control as="textarea" rows={3} maxLength={2000} value={entry.description} onChange={(event) => update(index, 'description', event.target.value)} /></label>
    <Button variant="outline-danger" size="sm" className="mt-2" onClick={() => onChange(entries.filter((_, position) => position !== index))}>{t('cv.entry.remove')}</Button>
  </div>)}<Button variant="outline-secondary" size="sm" disabled={entries.length >= 12} onClick={() => onChange([...entries, emptyEntry()])}>{t('cv.entry.add')}</Button></fieldset>
}

export default function CvPage() {
  const { t } = useTranslation('documents')
  const [draft, setDraft] = useState<CvDraft>(emptyCv)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  // Chưa đọc xong bản nháp cũ thì chưa tự lưu — kẻo bản trống ghi đè bản người dùng đã gõ hôm trước.
  const [loaded, setLoaded] = useState(false)
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const value = parseCvDraft(JSON.parse(raw))
        if (value) { setDraft(value); setMessage(t('cv.messages.restored')) } else setMessage(t('cv.messages.unreadable'))
      }
    } catch { setMessage(t('cv.messages.unreadable')) }
    setLoaded(true)
  }, [t])
  useEffect(() => {
    if (!loaded) return
    const timer = window.setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(draft)) } catch { setMessage(t('cv.messages.saveFailed')) } }, 400)
    return () => window.clearTimeout(timer)
  }, [draft, loaded, t])
  const update = (key: keyof CvDraft, value: CvDraft[typeof key]) => setDraft((current) => ({ ...current, [key]: value }))
  const clear = () => {
    if (!window.confirm(t('cv.confirmClear'))) return
    try { localStorage.removeItem(storageKey) } catch { /* bộ nhớ bị chặn: vẫn xoá trên màn hình */ }
    setDraft(emptyCv()); setPhotoUrl(null); setMessage(t('cv.messages.cleared'))
  }
  return <>
    <style>{`.cn-cv-layout{display:grid;grid-template-columns:minmax(290px,.8fr) minmax(0,1.2fr);gap:24px;align-items:start}.cn-cv-print{background:#fff;color:#202c3a;min-height:297mm;padding:18mm 19mm;box-shadow:0 3px 25px #0001;font:14px/1.55 Arial,sans-serif;overflow-wrap:anywhere}.cn-cv-header{display:flex;justify-content:space-between;gap:20px;align-items:start}.cn-cv-header h1{font-size:32px;margin:0 0 4px;font-weight:700}.cn-cv-header img{width:28mm;height:36mm;object-fit:cover}.cn-cv-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:10px;margin:0 0 6px;color:#64748b}.cn-cv-role{font-size:17px;margin:0}.cn-cv-contact{display:flex;gap:5px 14px;flex-wrap:wrap;border-bottom:1px solid #ccd5de;padding:14px 0}.cn-cv-section{margin-top:22px;break-inside:avoid}.cn-cv-section h2{font-size:14px;text-transform:uppercase;letter-spacing:.09em;border-bottom:1px solid #ccd5de;padding-bottom:5px;margin-bottom:10px}.cn-cv-entry{display:grid;grid-template-columns:95px 1fr;gap:14px;margin:10px 0;break-inside:avoid}.cn-cv-entry__period{color:#596777}.cn-cv--modern{border-top:8px solid #183d45}.cn-cv--modern .cn-cv-section h2{color:#17605b;border-color:#17605b}@media(max-width:1000px){.cn-cv-layout{grid-template-columns:1fr}}@media(max-width:600px){.cn-cv-print{padding:24px;min-height:0}.cn-cv-entry{grid-template-columns:1fr;gap:0}}@media print{@page{size:A4;margin:15mm 16mm}.erp-print-portal .cn-cv-print{width:auto;min-height:0;padding:0;box-shadow:none}.erp-print-portal .cn-cv-section{break-inside:auto}.erp-print-portal .cn-cv-section h2{break-after:avoid}}`}</style>
    <ToolBoard><div className="cn-cv-layout"><ToolPanel title={t('cv.title')}>
      <div className="d-flex flex-wrap align-items-center gap-2"><span className="erp-flow-field__hint">{t('cv.autoSave')}</span><Button variant="outline-danger" size="sm" onClick={clear}>{t('cv.clearDraft')}</Button></div>
      <label className="erp-flow-field__label mt-3">{t('cv.template')}<Form.Select value={draft.template} onChange={(event) => update('template', event.target.value as CvDraft['template'])}><option value="classic">{t('cv.templates.classic')}</option><option value="modern">{t('cv.templates.modern')}</option></Form.Select></label>
      {identityFields.map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.fields.${key}`)}<Form.Control type={key === 'email' ? 'email' : 'text'} maxLength={200} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <label className="erp-flow-field__label mt-3">{t('cv.photo')}<Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null) }} /></label>
      <label className="erp-flow-field__label mt-3">{t('cv.summary')}<Form.Control as="textarea" rows={4} maxLength={3000} value={draft.summary} onChange={(event) => update('summary', event.target.value)} /></label>
      <EntryEditor kind="experience" entries={draft.experience} onChange={(value) => update('experience', value)} /><EntryEditor kind="education" entries={draft.education} onChange={(value) => update('education', value)} />
      {(['skills', 'languages', 'certificates'] as const).map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.sections.${key}`)}<Form.Control as="textarea" rows={3} maxLength={3000} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <Button className="mt-3" onClick={() => window.print()}>{t('shared.print')}</Button><p role="status" className="mt-2">{message}</p>
    </ToolPanel><div><CvPreview draft={draft} photoUrl={photoUrl} /><p className="mt-3">{t('cv.note')}</p></div></div></ToolBoard>
    <PrintPortal><CvPreview draft={draft} photoUrl={photoUrl} /></PrintPortal>
  </>
}
