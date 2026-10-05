export interface CvEntry { period: string; organization: string; title: string; description: string }
export interface CvDraft {
  name: string; role: string; phone: string; email: string; location: string; link: string; summary: string
  experience: CvEntry[]; education: CvEntry[]; skills: string; languages: string; certificates: string
  template: 'classic' | 'modern'
}

export const emptyEntry = (): CvEntry => ({ period: '', organization: '', title: '', description: '' })
export const emptyCv = (): CvDraft => ({
  name: '', role: '', phone: '', email: '', location: '', link: '', summary: '',
  experience: [emptyEntry()], education: [emptyEntry()], skills: '', languages: '', certificates: '', template: 'classic',
})

export function parseCvDraft(value: unknown): CvDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  const fields = ['name', 'role', 'phone', 'email', 'location', 'link', 'summary', 'skills', 'languages', 'certificates'] as const
  if (fields.some((key) => typeof item[key] !== 'string' || (item[key] as string).length > 5000) || !['classic', 'modern'].includes(item.template as string)) return null
  const entries = (value: unknown): value is CvEntry[] => Array.isArray(value) && value.length <= 12 && value.every((entry) => entry && typeof entry === 'object' && ['period', 'organization', 'title', 'description'].every((key) => typeof entry[key] === 'string' && entry[key].length <= 5000))
  if (!entries(item.experience) || !entries(item.education)) return null
  return item as unknown as CvDraft
}
