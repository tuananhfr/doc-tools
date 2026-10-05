import { describe, expect, it } from 'vitest'
import { buildPromptPackage, redactPromptText } from './prompt-package'
import { parseAiProposal } from './ai-result'

describe('BYOAI safety', () => {
  it('excludes user context by default and redacts credentials when included', () => {
    expect(buildPromptPackage({ toolId: 'payroll', snapshot: null, checkedAt: null, jurisdiction: null, sources: [], context: 'Lương 30 triệu', includeContext: false }).context).not.toContain('30 triệu')
    expect(redactPromptText('Bearer abc123 api_key=secret user@example.com http://localhost:3003/private 0912345678')).not.toMatch(/abc123|secret|user@example.com|localhost|0912345678/)
  })
  it('parses only bounded structured proposals and never fetches sources', () => {
    const valid = JSON.stringify({ changes: [{ field: 'rate', before: '5', after: '6' }], sources: [{ url: 'https://example.com/rule', type: 'OFFICIAL_WEB' }], uncertainties: [] })
    expect(parseAiProposal(valid)?.changes[0].after).toBe('6')
    expect(parseAiProposal(valid.replace('https://', 'http://'))).toBeNull()
    expect(parseAiProposal(valid.replace('https://example.com/rule', 'https://localhost/rule'))).toBeNull()
    expect(parseAiProposal('<script>alert(1)</script>')).toBeNull()
  })
})
