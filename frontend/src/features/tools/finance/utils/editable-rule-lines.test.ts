import { describe, expect, it } from 'vitest'
import { editableRuleLines } from './editable-rule-lines'
import { parseRuleLines } from './rule-lines'

describe('editable tariff rows', () => {
  it.each(['50; 1.984', '50,1984', '50|1984', '50\t1984'])('preserves legacy columns: %s', input => {
    const serialized = editableRuleLines(input).map(row => row.join(';')).join('\n')
    expect(parseRuleLines(serialized, 'money')).toEqual(parseRuleLines(input, 'money'))
  })
  it('retains decimal commas and incomplete edits', () => {
    expect(editableRuleLines('50; 1.984,5\n*;')).toEqual([['50', '1.984,5'], ['*', '']])
  })
})
