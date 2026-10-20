import { useTranslation } from 'react-i18next'
import type { CvDraft, CvEntry } from '../models/cv'

function Lines({ value }: { value: string }) { return <div style={{ whiteSpace: 'pre-line' }}>{value || '—'}</div> }
function Entries({ title, entries }: { title: string; entries: CvEntry[] }) {
  const filled = entries.filter(item => item.period || item.organization || item.title || item.description)
  if (!filled.length) return null
  return <section className="cn-cv-section"><h2>{title}</h2>{filled.map((item, index) => <div className="cn-cv-entry" key={index}><div className="cn-cv-entry__period">{item.period}</div><div><strong>{item.title}</strong><div>{item.organization}</div><Lines value={item.description} /></div></div>)}</section>
}

export function CvPreview({ draft, photoUrl }: { draft: CvDraft; photoUrl: string | null }) {
  const { t } = useTranslation('documents')
  const sidebar = draft.template === 'sidebar'
  const details = [draft.phone, draft.email, draft.location, draft.link].filter(value => value.trim())
  const contact = details.length ? <div className="cn-cv-contact">{details.map((value, index) => <span key={index}>{value}</span>)}</div> : null
  const skills = <>{(['skills', 'languages', 'certificates'] as const).map(key => draft[key] ? <section className="cn-cv-section" key={key}><h2>{t(`cv.sections.${key}`)}</h2><Lines value={draft[key]} /></section> : null)}</>
  return <article className={`cn-cv-print cn-cv--${draft.template}`}>
    <header className="cn-cv-header"><div><p className="cn-cv-kicker">{t('cv.print.kicker')}</p><h1>{draft.name || t('cv.fields.name')}</h1><p className="cn-cv-role">{draft.role || t('cv.fields.role')}</p></div>{photoUrl ? <img src={photoUrl} alt={t('cv.photoAlt')} /> : null}</header>
    {sidebar ? null : contact}
    <div className="cn-cv-body">
      {sidebar ? <aside className="cn-cv-side">{contact}{skills}</aside> : null}
      <div className="cn-cv-main">
        {draft.summary ? <section className="cn-cv-section"><h2>{t('cv.print.summary')}</h2><Lines value={draft.summary} /></section> : null}
        <Entries title={t('cv.sections.experience')} entries={draft.experience} />
        <Entries title={t('cv.sections.education')} entries={draft.education} />
      </div>
    </div>
    {sidebar ? null : skills}
  </article>
}
