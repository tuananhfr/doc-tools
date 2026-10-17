import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { useDeferredValue, useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { PrintPortal, TemplatePicker, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { takeHandoff } from '@/features/tools/shared'
import { CvPreview } from '../components/CvPreview'
import { DocumentExportActions } from '../components/DocumentExportActions'
import { CV_TEMPLATES } from '../config/cv-templates'
import { cvDocument } from '../services/cv-document'
import { emptyEntry, type CvEntry } from '../models/cv'
import { withCvTemplate } from '../utils/template-switch'
import { DocumentTemplateLayout, TextDocumentStudio } from '../components/TextDocumentStudio'

import { useCvDraft } from '../hooks/useCvDraft'
const identityFields = ['name', 'role', 'phone', 'email', 'location', 'link'] as const

function EntryEditor({ kind, entries, onChange }: { kind: 'experience' | 'education'; entries: CvEntry[]; onChange: (entries: CvEntry[]) => void }) {
  const { t } = useTranslation('documents')
  const update = (index: number, key: keyof CvEntry, value: string) => onChange(entries.map((entry, position) => position === index ? { ...entry, [key]: value } : entry))
  return <fieldset className="cn-cv-edit-section mt-4"><legend className="h6"><Icon name={kind === 'experience' ? 'briefcase' : 'mortarboard'} className="me-2" />{t(`cv.sections.${kind}`)}</legend>{entries.map((entry, index) => <div className="cn-cv-edit-entry border rounded p-3 mb-3" key={index}>
    {([['period', t('cv.entry.period')], ['organization', kind === 'experience' ? t('cv.entry.company') : t('cv.entry.school')], ['title', kind === 'experience' ? t('cv.entry.position') : t('cv.entry.degree')]] as const).map(([key, label]) => <label className="erp-flow-field__label mb-2" key={key}>{label}<Form.Control value={entry[key]} maxLength={200} onChange={(event) => update(index, key, event.target.value)} /></label>)}
    <label className="erp-flow-field__label">{t('cv.entry.description')}<Form.Control as="textarea" rows={3} maxLength={2000} value={entry.description} onChange={(event) => update(index, 'description', event.target.value)} /></label>
    <Button variant="outline-danger" size="sm" className="mt-2" onClick={() => onChange(entries.filter((_, position) => position !== index))}>{t('cv.entry.remove')}</Button>
  </div>)}<Button variant="outline-secondary" size="sm" disabled={entries.length >= 12} onClick={() => onChange([...entries, emptyEntry()])}>{t('cv.entry.add')}</Button></fieldset>
}

export default function CvPage() {
  const { t } = useTranslation('documents')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.cv' })
  const { draft, update, changeTemplate, remember, changeRemember, availableDraft, restore, clear: clearDraft, message } = useCvDraft()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFromHandoff, setPhotoFromHandoff] = useState(false)
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  // Ảnh từ nút "Dùng làm ảnh trong CV" của Ảnh thẻ: chỉ lấy lúc mount — `takeHandoff` trả đúng một lần nên StrictMode chạy effect hai lượt cũng không nạp đôi.
  useEffect(() => {
    const [file] = takeHandoff('cv')
    if (file) { setPhotoUrl(URL.createObjectURL(file)); setPhotoFromHandoff(true) }
  }, [])
  // Năm thumbnail vẽ lại theo từng phím gõ; để chậm một nhịp sau ô nhập cho gõ không bị giật.
  const thumbDraft = useDeferredValue(draft)
  const clear = () => {
    if (window.confirm(t('cv.confirmClear')) && clearDraft()) { setPhotoUrl(null); setPhotoFromHandoff(false) }
  }
  const buildDocument = async () => cvDocument(draft, { name: t('cv.fields.name'), role: t('cv.fields.role'), summary: t('cv.print.summary'), experience: t('cv.sections.experience'), education: t('cv.sections.education'), skills: t('cv.sections.skills'), languages: t('cv.sections.languages'), certificates: t('cv.sections.certificates') }, photoUrl ? await (await fetch(photoUrl)).blob() : undefined)
  const picker = <TemplatePicker label={t('cv.template')} value={draft.template} onChange={changeTemplate} items={CV_TEMPLATES.map(template => ({ id: template.id, label: t(`cv.templates.${template.id}`), preview: <div className="cn-template-page"><CvPreview draft={withCvTemplate(thumbDraft, template.id)} photoUrl={photoUrl} /></div> }))} />
  return <>

    <TextDocumentStudio kind="cv"><div className="cn-cv-workspace cn-cv-studio"><DocumentTemplateLayout templates={picker} actions={<DocumentExportActions build={buildDocument} />} preview={<><div className="cn-cv-preview-paper"><CvPreview draft={draft} photoUrl={photoUrl} /></div><p className="mt-3">{t('cv.note')}</p></>}><ToolPanel title={`2. ${studio('personalTitle')}`} actions={<span className="cn-studio-small-icon"><Icon name="pencil-square" /></span>}>
      <p className="cn-cv-intro">{studio('inputHint')}</p>
      {availableDraft ? <div className="cn-cv-restore"><p>{t('cv.availableDraft')}</p><Button variant="outline-secondary" onClick={restore}>{t('cv.openDraft')}</Button></div> : null}
      <div className="cn-document-fields">
        {identityFields.map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.fields.${key}`)}<Form.Control type={key === 'email' ? 'email' : 'text'} maxLength={200} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      </div>
      <label className="erp-flow-field__label mt-3">{t('cv.photo')}<FileInput accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null); setPhotoFromHandoff(false) }} /></label>
      {photoFromHandoff ? <p className="erp-flow-field__hint mt-1" role="status">{t('cv.photoFromHandoff')}</p> : null}
      <label className="erp-flow-field__label mt-3">{t('cv.summary')}<Form.Control as="textarea" rows={4} maxLength={3000} value={draft.summary} onChange={(event) => update('summary', event.target.value)} /></label>
      <EntryEditor kind="experience" entries={draft.experience} onChange={(value) => update('experience', value)} /><EntryEditor kind="education" entries={draft.education} onChange={(value) => update('education', value)} />
      {(['skills', 'languages', 'certificates'] as const).map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.sections.${key}`)}<Form.Control as="textarea" rows={3} maxLength={3000} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
      <details className="cn-cv-draft mt-3"><summary>{t('cv.remember')}</summary>
        <div className="d-flex flex-wrap align-items-center gap-2"><Form.Check id="cn-cv-remember" type="checkbox" label={t('cv.remember')} checked={remember} onChange={event => changeRemember(event.target.checked)} /><Button variant="outline-danger" size="sm" onClick={clear}>{t('cv.clearDraft')}</Button></div>
        <p className="erp-flow-field__hint mt-2">{t(remember ? 'cv.autoSave' : 'cv.memoryOnly')}</p>
      </details>
      <div className="mt-3"><DocumentExportActions build={buildDocument} /></div><p role="status" className="mt-2">{message ? t(message) : null}</p>
    </ToolPanel></DocumentTemplateLayout></div></TextDocumentStudio>
    <PrintPortal><CvPreview draft={draft} photoUrl={photoUrl} /></PrintPortal>
  </>
}
