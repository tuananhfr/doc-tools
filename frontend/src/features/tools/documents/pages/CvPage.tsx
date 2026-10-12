import { useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { PrintPortal, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { CvPreview } from '../components/CvPreview'
import { DocumentExportActions } from '../components/DocumentExportActions'
import { CV_TEMPLATES } from '../config/cv-templates'
import { cvDocument } from '../services/cv-document'
import { emptyEntry, type CvDraft, type CvEntry } from '../models/cv'
import { ResponsivePreview } from '@/features/tools/hub/components/board/ResponsivePreview'

import { useCvDraft } from '../hooks/useCvDraft'
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
  const { draft, update, remember, changeRemember, availableDraft, restore, clear: clearDraft, message } = useCvDraft()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  const clear = () => {
    if (window.confirm(t('cv.confirmClear')) && clearDraft()) setPhotoUrl(null)
  }
  const buildDocument = async () => cvDocument(draft, { name: t('cv.fields.name'), role: t('cv.fields.role'), summary: t('cv.print.summary'), experience: t('cv.sections.experience'), education: t('cv.sections.education'), skills: t('cv.sections.skills'), languages: t('cv.sections.languages'), certificates: t('cv.sections.certificates') }, photoUrl ? await (await fetch(photoUrl)).blob() : undefined)
  return <>

    <div className="cn-cv-workspace"><ToolBoard><ResponsivePreview action={<DocumentExportActions build={buildDocument} />} preview={<><CvPreview draft={draft} photoUrl={photoUrl} /><p className="mt-3">{t('cv.note')}</p></>}><ToolPanel title={t('cv.title')}>
      <div className="d-flex flex-wrap align-items-center gap-2"><Form.Check id="cn-cv-remember" type="checkbox" label={t('cv.remember')} checked={remember} onChange={event => changeRemember(event.target.checked)} /><Button variant="outline-danger" size="sm" onClick={clear}>{t('cv.clearDraft')}</Button></div>
      {availableDraft ? <div className="cn-cv-restore"><p>{t('cv.availableDraft')}</p><Button variant="outline-secondary" onClick={restore}>{t('cv.openDraft')}</Button></div> : null}
      <p className="erp-flow-field__hint mt-2">{t(remember ? 'cv.autoSave' : 'cv.memoryOnly')}</p>
      <label className="erp-flow-field__label mt-3">{t('cv.template')}<Form.Select aria-label={t('cv.template')} value={draft.template} onChange={(event) => update('template', event.target.value as CvDraft['template'])}>{CV_TEMPLATES.map(template => <option key={template.id} value={template.id}>{t(`cv.templates.${template.id}`)}</option>)}</Form.Select></label>
      {identityFields.map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.fields.${key}`)}<Form.Control type={key === 'email' ? 'email' : 'text'} maxLength={200} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <label className="erp-flow-field__label mt-3">{t('cv.photo')}<Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null) }} /></label>
      <label className="erp-flow-field__label mt-3">{t('cv.summary')}<Form.Control as="textarea" rows={4} maxLength={3000} value={draft.summary} onChange={(event) => update('summary', event.target.value)} /></label>
      <EntryEditor kind="experience" entries={draft.experience} onChange={(value) => update('experience', value)} /><EntryEditor kind="education" entries={draft.education} onChange={(value) => update('education', value)} />
      {(['skills', 'languages', 'certificates'] as const).map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.sections.${key}`)}<Form.Control as="textarea" rows={3} maxLength={3000} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <div className="mt-3"><DocumentExportActions build={buildDocument} /></div><p role="status" className="mt-2">{message ? t(message) : null}</p>
    </ToolPanel></ResponsivePreview></ToolBoard></div>
    <PrintPortal><CvPreview draft={draft} photoUrl={photoUrl} /></PrintPortal>
  </>
}
