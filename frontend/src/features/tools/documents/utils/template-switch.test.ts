import { describe, expect, it } from 'vitest'
import { CV_TEMPLATES } from '../config/cv-templates'
import { emptyCv, type CvDraft } from '../models/cv'
import { withCvTemplate } from './template-switch'

const filled = (): CvDraft => ({
  ...emptyCv(),
  name: 'Nguyễn Văn An', role: 'Kế toán', phone: '0900000000', email: 'an@example.test', location: 'Hà Nội', link: 'x.test/an',
  summary: 'Năm năm kinh nghiệm', skills: 'Excel', languages: 'Tiếng Anh', certificates: 'CPA',
  experience: [{ period: '2020–2025', organization: 'Công ty A', title: 'Kế toán', description: 'Sổ sách' }],
  education: [{ period: '2016–2020', organization: 'ĐH B', title: 'Kế toán', description: '' }],
})

describe('withCvTemplate', () => {
  it('only changes the template — every typed field stays (spec v3 UI03)', () => {
    const draft = filled()
    const next = withCvTemplate(draft, 'sidebar')
    expect(next).toEqual({ ...draft, template: 'sidebar' })
    expect(next.experience).toBe(draft.experience)
  })

  it('survives a pass through all five templates and back', () => {
    const draft = filled()
    const back = CV_TEMPLATES.reduce((current, template) => withCvTemplate(current, template.id), draft)
    expect(CV_TEMPLATES).toHaveLength(5)
    expect(withCvTemplate(back, draft.template)).toEqual(draft)
  })

  it('returns the same draft when the template does not change', () => {
    const draft = filled()
    expect(withCvTemplate(draft, draft.template)).toBe(draft)
  })
})
