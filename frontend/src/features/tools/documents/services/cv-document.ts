import { cvTemplate } from '../config/cv-templates'
import type { CvDraft, CvEntry } from '../models/cv'
import type { DocumentBlock, PrintDocument } from '../types/print-document'

export interface CvLabels {
  name: string; role: string; summary: string; experience: string; education: string; skills: string; languages: string; certificates: string
}

export function cvDocument(draft: CvDraft, labels: CvLabels, photo?: Blob): PrintDocument {
  const template = cvTemplate(draft.template)
  const blocks: DocumentBlock[] = [{ kind: 'title', text: draft.name || labels.name }, { kind: 'subtitle', text: draft.role || labels.role }]
  const contacts = [draft.phone, draft.email, draft.location, draft.link].filter(Boolean).join(' · ')
  const sidebar: DocumentBlock[] = contacts ? [{ kind: 'paragraph', text: contacts }] : []
  const section = (title: string, text: string, target = blocks) => { if (text.trim()) target.push({ kind: 'heading', text: title }, { kind: 'paragraph', text }) }
  const entries = (title: string, rows: CvEntry[]) => {
    const filled = rows.filter(row => row.period || row.title || row.organization || row.description)
    if (!filled.length) return
    blocks.push({ kind: 'heading', text: title })
    for (const row of filled) blocks.push({ kind: 'subtitle', text: [row.title, row.organization, row.period].filter(Boolean).join(' · ') }, ...(row.description ? [{ kind: 'paragraph' as const, text: row.description }] : []))
  }
  if (template.layout !== 'sidebar' && contacts) blocks.push(...sidebar)
  section(labels.summary, draft.summary)
  entries(labels.experience, draft.experience); entries(labels.education, draft.education)
  const target = template.layout === 'sidebar' ? sidebar : blocks
  section(labels.skills, draft.skills, target); section(labels.languages, draft.languages, target); section(labels.certificates, draft.certificates, target)
  return { title: draft.name || labels.name, name: draft.name || 'CV', font: template.font, fontSize: template.fontSize, accent: template.accent, layout: template.layout, blocks, sidebar: template.layout === 'sidebar' ? sidebar : undefined, photo }
}
