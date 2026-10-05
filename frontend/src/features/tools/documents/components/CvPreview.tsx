import type { CvDraft, CvEntry } from '../models/cv'

function Lines({ value }: { value: string }) { return <div style={{ whiteSpace: 'pre-line' }}>{value || '—'}</div> }
function Entries({ title, entries }: { title: string; entries: CvEntry[] }) {
  if (!entries.some((item) => item.organization || item.title || item.description)) return null
  return <section className="cn-cv-section"><h2>{title}</h2>{entries.map((item, index) => <div className="cn-cv-entry" key={index}><div className="cn-cv-entry__period">{item.period}</div><div><strong>{item.title}</strong><div>{item.organization}</div><Lines value={item.description} /></div></div>)}</section>
}

export function CvPreview({ draft, photoUrl }: { draft: CvDraft; photoUrl: string | null }) {
  return <article className={`cn-cv-print cn-cv--${draft.template}`}>
    <header className="cn-cv-header"><div><p className="cn-cv-kicker">Hồ sơ ứng tuyển</p><h1>{draft.name || 'Họ và tên'}</h1><p className="cn-cv-role">{draft.role || 'Vị trí ứng tuyển'}</p></div>{photoUrl ? <img src={photoUrl} alt="Ảnh chân dung trong CV" /> : null}</header>
    <div className="cn-cv-contact">{[draft.phone, draft.email, draft.location, draft.link].filter(Boolean).map((value) => <span key={value}>{value}</span>)}</div>
    {draft.summary ? <section className="cn-cv-section"><h2>Giới thiệu</h2><Lines value={draft.summary} /></section> : null}
    <Entries title="Kinh nghiệm" entries={draft.experience} />
    <Entries title="Học vấn" entries={draft.education} />
    {draft.skills ? <section className="cn-cv-section"><h2>Kỹ năng</h2><Lines value={draft.skills} /></section> : null}
    {draft.languages ? <section className="cn-cv-section"><h2>Ngoại ngữ</h2><Lines value={draft.languages} /></section> : null}
    {draft.certificates ? <section className="cn-cv-section"><h2>Chứng chỉ</h2><Lines value={draft.certificates} /></section> : null}
  </article>
}
