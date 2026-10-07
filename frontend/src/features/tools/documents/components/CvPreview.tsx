import { useTranslation } from 'react-i18next'
import type { CvDraft, CvEntry } from '../models/cv'

function Lines({ value }: { value: string }) { return <div style={{ whiteSpace: 'pre-line' }}>{value || '—'}</div> }
function Entries({ title, entries }: { title: string; entries: CvEntry[] }) {
  if (!entries.some((item) => item.organization || item.title || item.description)) return null
  return <section className="cn-cv-section"><h2>{title}</h2>{entries.map((item, index) => <div className="cn-cv-entry" key={index}><div className="cn-cv-entry__period">{item.period}</div><div><strong>{item.title}</strong><div>{item.organization}</div><Lines value={item.description} /></div></div>)}</section>
}

// CV in ra theo ngôn ngữ trang; chỉ phần người dùng gõ giữ nguyên.
export function CvPreview({ draft, photoUrl }: { draft: CvDraft; photoUrl: string | null }) {
  const { t } = useTranslation('documents')
  return <article className={`cn-cv-print cn-cv--${draft.template}`}>
    <header className="cn-cv-header"><div><p className="cn-cv-kicker">{t('cv.print.kicker')}</p><h1>{draft.name || t('cv.fields.name')}</h1><p className="cn-cv-role">{draft.role || t('cv.fields.role')}</p></div>{photoUrl ? <img src={photoUrl} alt={t('cv.photoAlt')} /> : null}</header>
    <div className="cn-cv-contact">{[draft.phone, draft.email, draft.location, draft.link].filter(Boolean).map((value) => <span key={value}>{value}</span>)}</div>
    {draft.summary ? <section className="cn-cv-section"><h2>{t('cv.print.summary')}</h2><Lines value={draft.summary} /></section> : null}
    <Entries title={t('cv.sections.experience')} entries={draft.experience} />
    <Entries title={t('cv.sections.education')} entries={draft.education} />
    {draft.skills ? <section className="cn-cv-section"><h2>{t('cv.sections.skills')}</h2><Lines value={draft.skills} /></section> : null}
    {draft.languages ? <section className="cn-cv-section"><h2>{t('cv.sections.languages')}</h2><Lines value={draft.languages} /></section> : null}
    {draft.certificates ? <section className="cn-cv-section"><h2>{t('cv.sections.certificates')}</h2><Lines value={draft.certificates} /></section> : null}
  </article>
}
