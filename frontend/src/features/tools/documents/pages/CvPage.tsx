import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { useCallback, useEffect, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { PrintPortal, TemplatePicker, ToolLeaveGuard, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { takeHandoff } from '@/features/tools/shared'
import { CvPreview } from '../components/CvPreview'
import { DocumentExportActions } from '../components/DocumentExportActions'
import { CV_TEMPLATES } from '../config/cv-templates'
import { cvDocument } from '../services/cv-document'
import { emptyEntry, type CvEntry } from '../models/cv'
import { cvExample } from '../config/cv-examples'
import { cvContactError } from '../utils/cv-contact-validation'
import { capitalizeInitial } from '../utils/capitalization'
import { hasCvContent } from '../services/cv-draft-storage'
import { DocumentTemplateLayout, TextDocumentStudio } from '../components/TextDocumentStudio'

import { useCvPdfPreview } from '../hooks/useCvPdfPreview'
import { useCvDraft } from '../hooks/useCvDraft'
const identityFields = ['name', 'role', 'phone', 'email', 'location', 'link'] as const

function EntryEditor({ kind, entries, onChange }: { kind: 'experience' | 'education'; entries: CvEntry[]; onChange: (entries: CvEntry[]) => void }) {
  const { t } = useTranslation('documents')
  const update = (index: number, key: keyof CvEntry, value: string) => onChange(entries.map((entry, position) => position === index ? { ...entry, [key]: value } : entry))
  return <fieldset className="cn-cv-edit-section mt-4"><legend className="h6"><Icon name={kind === 'experience' ? 'briefcase' : 'mortarboard'} className="me-2" />{t(`cv.sections.${kind}`)}</legend>{entries.map((entry, index) => <div className="cn-cv-edit-entry border rounded p-3 mb-3" key={index}>
    {([['period', t('cv.entry.period')], ['organization', kind === 'experience' ? t('cv.entry.company') : t('cv.entry.school')], ['title', kind === 'experience' ? t('cv.entry.position') : t('cv.entry.degree')]] as const).map(([key, label]) => <label className="erp-flow-field__label mb-2" key={key}>{label}<Form.Control autoCapitalize="sentences" value={entry[key]} maxLength={200} onBlur={event => { if (key !== 'period') update(index, key, capitalizeInitial(event.target.value)) }} onChange={(event) => update(index, key, event.target.value)} /></label>)}
    <label className="erp-flow-field__label">{t('cv.entry.description')}<Form.Control as="textarea" autoCapitalize="sentences" rows={3} maxLength={2000} value={entry.description} onBlur={event => update(index, 'description', capitalizeInitial(event.target.value))} onChange={(event) => update(index, 'description', event.target.value)} /></label>
    <Button variant="outline-danger" size="sm" className="mt-2" onClick={() => onChange(entries.filter((_, position) => position !== index))}>{t('cv.entry.remove')}</Button>
  </div>)}<Button variant="outline-secondary" size="sm" disabled={entries.length >= 12} onClick={() => onChange([...entries, emptyEntry()])}>{t('cv.entry.add')}</Button></fieldset>
}

export default function CvPage() {
  const { t, i18n } = useTranslation('documents')
  const { t: common } = useTranslation('common')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.cv' })
  const { draft, update, replace, changeTemplate, availableDraft, restore, clear: clearDraft, message, unsaved } = useCvDraft()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFromHandoff, setPhotoFromHandoff] = useState(false)
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  // Ảnh từ nút "Dùng làm ảnh trong CV" của Ảnh thẻ: chỉ lấy lúc mount — `takeHandoff` trả đúng một lần nên StrictMode chạy effect hai lượt cũng không nạp đôi.
  useEffect(() => {
    const [file] = takeHandoff('cv')
    if (file) { setPhotoUrl(URL.createObjectURL(file)); setPhotoFromHandoff(true) }
  }, [])
  // The gallery uses independent examples; selecting a style never replaces personal content.
  const clear = () => {
    if (window.confirm(t('cv.confirmClear')) && clearDraft()) { setPhotoUrl(null); setPhotoFromHandoff(false) }
  }
  const invalidContact = identityFields.some(key => cvContactError(key, draft[key]))
  const showingExample = !hasCvContent(draft) && !photoUrl
  const previewDraft = showingExample ? cvExample(draft.template, i18n.language) : draft
  const buildDocument = useCallback(async () => cvDocument(previewDraft, { name: t('cv.fields.name'), role: t('cv.fields.role'), summary: t('cv.print.summary'), experience: t('cv.sections.experience'), education: t('cv.sections.education'), skills: t('cv.sections.skills'), languages: t('cv.sections.languages'), certificates: t('cv.sections.certificates') }, photoUrl ? await (await fetch(photoUrl)).blob() : undefined), [draft, showingExample, i18n.language, photoUrl, t])
  const { getPdf, pages, failed } = useCvPdfPreview(buildDocument)
  const pdfPages = <div className="cn-cv-pdf-pages">{pages.map((url, index) => <img key={url} src={url} alt={`${t('shared.downloadPdf')} · ${index + 1}`} />)}</div>
  const loadExample = () => {
    if ((hasCvContent(draft) || photoUrl) && !window.confirm(t('cv.exampleConfirm'))) return
    replace(cvExample(draft.template, i18n.language)); setPhotoUrl(null); setPhotoFromHandoff(false)
  }
  const picker = <><TemplatePicker label={t('cv.template')} value={draft.template} onChange={changeTemplate} items={CV_TEMPLATES.map(template => ({ id: template.id, label: t(`cv.templates.${template.id}`), preview: <div className="cn-template-page"><CvPreview draft={cvExample(template.id, i18n.language)} photoUrl={null} /></div> }))} /><div className="cn-cv-example"><p>{t(`cv.templateHints.${draft.template}`)}</p><Button variant="outline-primary" onClick={loadExample}><Icon name="file-earmark-text" />{t('cv.example')}</Button><small>{t('cv.exampleNotice')}</small></div></>
  return <>

    <TextDocumentStudio kind="cv"><div className="cn-cv-workspace cn-cv-studio"><DocumentTemplateLayout templates={picker} actions={<DocumentExportActions build={buildDocument} pdf={getPdf} printReady={pages.length > 0} disabled={invalidContact} />} preview={<>{showingExample ? <p className="cn-cv-example-label" role="status">{t('cv.exampleNotice')}</p> : null}<div className="cn-cv-preview-paper" aria-busy={!pages.length && !failed}>{pages.length ? <>{pdfPages}<div className="visually-hidden"><CvPreview draft={previewDraft} photoUrl={photoUrl} /></div></> : <p role={failed ? 'alert' : 'status'}>{t(failed ? 'shared.exportFailed' : 'shared.exporting')}</p>}</div><p className="mt-3">{t('cv.note')}</p></>}><ToolPanel title={`2. ${studio('personalTitle')}`} actions={<span className="cn-studio-small-icon"><Icon name="pencil-square" /></span>}>
      <p className="cn-cv-intro">{studio('inputHint')}</p>
      {message === 'cv.messages.saveFailed' || message === 'cv.messages.unreadable' ? <p role="alert">{t(message)}</p> : null}
      {availableDraft ? <div className="cn-cv-restore"><p>{t('cv.availableDraft')}</p><Button variant="outline-secondary" onClick={restore}>{t('cv.openDraft')}</Button></div> : null}
      <div className="cn-document-fields">
        {identityFields.map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.fields.${key}`)}{['phone', 'email', 'location', 'link'].includes(key) ? <small className="cn-cv-optional">{t('cv.optional')}</small> : null}<Form.Control type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : key === 'link' ? 'url' : 'text'} autoCapitalize={key === 'name' ? 'words' : key === 'email' || key === 'link' ? 'none' : 'sentences'} autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel' : key === 'email' ? 'email' : key === 'location' ? 'address-level2' : 'off'} inputMode={key === 'phone' ? 'numeric' : key === 'email' ? 'email' : key === 'link' ? 'url' : undefined} isInvalid={Boolean(cvContactError(key, draft[key]))} aria-invalid={Boolean(cvContactError(key, draft[key]))} aria-describedby={cvContactError(key, draft[key]) ? `cv-${key}-error` : undefined} placeholder={key === 'phone' ? '0901234567' : key === 'email' ? 'tenban@example.com' : key === 'link' ? 'https://example.com/portfolio' : undefined} maxLength={200} value={draft[key]} onBlur={event => { if (key === 'name' || key === 'role' || key === 'location') update(key, capitalizeInitial(event.target.value, key === 'name')) }} onChange={(event) => update(key, event.target.value)} />{cvContactError(key, draft[key]) ? <Form.Control.Feedback id={`cv-${key}-error`} type="invalid" role="alert">{t(cvContactError(key, draft[key])!)}</Form.Control.Feedback> : null}</label>)}
      </div>
      <p className="erp-flow-field__hint cn-cv-contact-hint">{t('cv.contactHint')}</p>
      <label className="erp-flow-field__label mt-3">{t('cv.photo')}<FileInput accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = (event.target as HTMLInputElement).files?.[0]; setPhotoUrl(file ? URL.createObjectURL(file) : null); setPhotoFromHandoff(false) }} /></label>
      {photoFromHandoff ? <p className="erp-flow-field__hint mt-1" role="status">{t('cv.photoFromHandoff')}</p> : null}
      <label className="erp-flow-field__label mt-3">{t('cv.summary')}<Form.Control as="textarea" autoCapitalize="sentences" rows={4} maxLength={3000} value={draft.summary} onBlur={event => update('summary', capitalizeInitial(event.target.value))} onChange={(event) => update('summary', event.target.value)} /></label>
      <EntryEditor kind="experience" entries={draft.experience} onChange={(value) => update('experience', value)} /><EntryEditor kind="education" entries={draft.education} onChange={(value) => update('education', value)} />
      {(['skills', 'languages', 'certificates'] as const).map((key) => <label className="erp-flow-field__label mt-3" key={key}>{t(`cv.sections.${key}`)}<Form.Control as="textarea" autoCapitalize="sentences" rows={3} maxLength={3000} value={draft[key]} onBlur={event => update(key, capitalizeInitial(event.target.value))} onChange={(event) => update(key, event.target.value)} /></label>)}
      <Button variant="outline-danger" size="sm" className="mt-3" onClick={clear}>{t('cv.clearDraft')}</Button>
      <div className="mt-3"><DocumentExportActions build={buildDocument} pdf={getPdf} printReady={pages.length > 0} disabled={invalidContact} /></div>
    </ToolPanel></DocumentTemplateLayout></div></TextDocumentStudio>
    <PrintPortal>{pdfPages}</PrintPortal>
    <ToolLeaveGuard active={unsaved || Boolean(photoUrl)} message={common('workspace.unsaved')} />
  </>
}
