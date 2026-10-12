import { describe, expect, it } from 'vitest'
import { CV_TEMPLATES } from '../config/cv-templates'
import { emptyCv, type CvDraft } from '../models/cv'
import { anyFormEdited, formEdited, switchFormKind, withCvTemplate, type FormSwitchState } from './template-switch'

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

type Kind = 'leave' | 'receipt' | 'agreement'
const defaults = (kind: Kind): Record<string, string> => (kind === 'leave' ? { recipient: 'Ban giám đốc', name: '' } : { name: '', amount: '' })
const start = (): FormSwitchState<Kind> => ({ kind: 'leave', values: defaults('leave'), drafts: {} })

describe('switchFormKind', () => {
  it('stashes the current draft and brings it back when the user returns', () => {
    const typed = { ...start(), values: { recipient: 'Ban giám đốc', name: 'Trần Thị Bình' } }
    const receipt = switchFormKind(typed, 'receipt', defaults)
    expect(receipt.kind).toBe('receipt')
    expect(receipt.values).toEqual(defaults('receipt'))
    const back = switchFormKind(receipt, 'leave', defaults)
    expect(back.values).toEqual({ recipient: 'Ban giám đốc', name: 'Trần Thị Bình' })
  })

  it('keeps a separate draft per kind across a full cycle', () => {
    let state = start()
    for (const [kind, name] of [['leave', 'A'], ['receipt', 'B'], ['agreement', 'C']] as const) {
      state = switchFormKind(state, kind, defaults)
      state = { ...state, values: { ...state.values, name } }
    }
    for (const [kind, name] of [['leave', 'A'], ['receipt', 'B'], ['agreement', 'C']] as const) {
      state = switchFormKind(state, kind, defaults)
      expect(state.values.name).toBe(name)
    }
  })

  it('does nothing when the kind does not change', () => {
    const state = start()
    expect(switchFormKind(state, 'leave', defaults)).toBe(state)
  })
})

describe('form edit detection', () => {
  it('ignores whitespace-only changes', () => {
    expect(formEdited({ name: '  ' }, { name: '' })).toBe(false)
    expect(formEdited({ name: 'x' }, { name: '' })).toBe(true)
  })

  it('counts a stashed draft of another kind as unsaved work', () => {
    const typed = { ...start(), values: { recipient: 'Ban giám đốc', name: 'Bình' } }
    const moved = switchFormKind(typed, 'receipt', defaults)
    expect(formEdited(moved.values, defaults('receipt'))).toBe(false)
    expect(anyFormEdited(moved, defaults)).toBe(true)
    expect(anyFormEdited(start(), defaults)).toBe(false)
  })
})
