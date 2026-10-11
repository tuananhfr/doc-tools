import { describe, expect, it } from 'vitest'
import { contributionPayload } from './contribution-payload'

const input = { mode: 'feedback' as const, category: 'bug' as const, toolSlug: 'nen-pdf', title: '  Không tải được kết quả  ', detail: 'Nén xong nhưng nút tải không hoạt động', source: { url: 'https://example.com/reference', type: 'OTHER' as const }, attribution: true }

describe('contribution context', () => {
  it('sends only entered feedback and the tool identity, without sources or public attribution', () => {
    expect(contributionPayload(input)).toEqual({ toolId: 'nen-pdf', domain: 'feedback-bug', baseSnapshotId: null, jurisdiction: null, proposedChanges: [{ field: 'bug', before: '', after: 'Không tải được kết quả\nNén xong nhưng nút tải không hoạt động' }], sourceRefs: [], attribution: false })
    expect(contributionPayload({ ...input, category: 'improvement' }).domain).toBe('feedback-improvement')
  })
  it.each([['doi-dia-chi', 'addresses'], ['luong', 'payroll'], ['tien-dien', 'electricity'], ['nen-pdf', 'legal']])('routes data for %s to %s', (toolSlug, domain) => {
    expect(contributionPayload({ ...input, category: 'data', toolSlug })).toMatchObject({ toolId: toolSlug, domain, jurisdiction: 'VN', sourceRefs: [input.source] })
  })
  it('uses the website context when no tool is selected', () => {
    expect(contributionPayload({ ...input, toolSlug: undefined }).toolId).toBe('gop-y-quy-dinh')
  })
  it('keeps idea publication separate from tool feedback', () => {
    expect(contributionPayload({ ...input, mode: 'idea' })).toMatchObject({ toolId: 'de-xuat-tien-ich', domain: 'ideas', sourceRefs: [], jurisdiction: null, attribution: true })
  })
})
