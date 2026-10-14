import { describe, expect, it } from 'vitest'
import { hostCheckTask, hostSourceCheckText } from './host-source-check'

const TEMPLATES: Record<string, string> = {
  'host.check.body': 'R:\n{{result}}\n\n{{source}}',
  'host.check.source': 'S {{title}} | {{from}} | {{url}}',
  'host.check.noSource': 'NONE',
}
const t = (key: string, values: Record<string, unknown> = {}) => TEMPLATES[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name]))
const snapshot = { id: 's1', effectiveFrom: '2025-05-10', sourceTitle: 'QĐ 1279/QĐ-BCT', sourceUrl: 'https://example.vn/qd' }

describe('hostCheckTask', () => {
  it.each([['electricity', 'check_electricity'], ['payroll', 'check_payroll'], ['addresses', 'check_address']])('%s → %s', (domain, task) => {
    expect(hostCheckTask(domain)).toBe(task)
  })
  it.each(['unknown', '', 'constructor', 'toString'])('refuses %s', (domain) => {
    expect(hostCheckTask(domain)).toBeNull()
  })
})

describe('hostSourceCheckText', () => {
  it('sends the trimmed result with the signed source', () => {
    expect(hostSourceCheckText('  120 kWh = 300.000 đ \n', snapshot, t, 4000)).toBe('R:\n120 kWh = 300.000 đ\n\nS QĐ 1279/QĐ-BCT | 2025-05-10 | https://example.vn/qd')
  })
  it('says the figures were typed in when there is no signed package', () => {
    expect(hostSourceCheckText('X', null, t, 4000)).toBe('R:\nX\n\nNONE')
  })
  it('never exceeds the host limit', () => {
    expect(hostSourceCheckText('x'.repeat(5000), snapshot, t, 4000)).toHaveLength(4000)
  })
})
