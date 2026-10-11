import { describe, expect, it } from 'vitest'
import { receiptAmount, receiptProblem, receiptWords } from './receipt'

describe('receipt validation', () => {
  it('reads Vietnamese money grouping consistently in figures and words', () => {
    expect(receiptAmount('2.500.000')).toBe(2500000)
    expect(receiptWords('2.500.000')).toBe('Hai triệu năm trăm nghìn')
  })
  it.each(['0', '-1', '1,5', '1e6', '12x3', '1000000000000000'])('rejects invalid VND amounts: %s', text => expect(receiptAmount(text)).toBeNull())
  it('requires both parties and a real calendar date', () => {
    const values = { sender: 'A', receiver: 'B', amount: '2.000', date: '31/02/2026' }
    expect(receiptProblem(values)).toBe('date')
    expect(receiptProblem({ ...values, date: '29/02/2028' })).toBeNull()
    expect(receiptProblem({ ...values, sender: ' ' })).toBe('required')
  })
})
