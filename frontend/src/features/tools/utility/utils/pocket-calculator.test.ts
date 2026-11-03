import { describe, expect, it } from 'vitest'
import { calculateExpression } from './pocket-calculator'

describe('pocket calculator', () => {
  it.each([
    ['0.1 + 0.2', '0.3'], ['0,1 + 0,2', '0.3'], ['12 × (3 + 2)', '60'],
    ['-2*-3', '6'], ['1/3*3', '1'], ['10%', '0.1'], ['250*8%', '20'],
    ['.5+.25', '0.75'], ['1/6', '0.166666666667'], ['-0', '0'],
    ['99999999999999999999+1', '100000000000000000000'],
  ])('%s = %s', (input, value) => expect(calculateExpression(input)).toEqual({ ok: true, value }))
  it.each(['2/0', '0/0', '1/(2-2)'])('rejects division by zero: %s', input => {
    expect(calculateExpression(input)).toEqual({ ok: false, error: 'zero' })
  })
  it.each(['alert(1)', '1e3', '2**3', '2.3.4'])('rejects invalid input: %s', input => {
    expect(calculateExpression(input).ok).toBe(false)
  })
  it('bounds work and leaves incomplete input recoverable', () => {
    expect(calculateExpression('2+')).toEqual({ ok: false, error: 'incomplete' })
    expect(calculateExpression('('.repeat(51) + '1' + ')'.repeat(51))).toEqual({ ok: false, error: 'large' })
  })
})
