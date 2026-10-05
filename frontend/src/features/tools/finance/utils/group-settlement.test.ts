import { expect, it } from 'vitest'
import { settleGroup } from './group-settlement'

it('settles unequal group expenses without losing value', () => {
  const result = settleGroup(['An', 'Bình', 'Chi'], [
    { payer: 'An', amount: 300000, participants: ['An', 'Bình', 'Chi'] },
    { payer: 'Bình', amount: 60000, participants: ['Bình', 'Chi'] },
  ])
  expect(result?.balances).toEqual({ An: 200000, Bình: -70000, Chi: -130000 })
  expect(result?.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)).toBe(200000)
  expect(settleGroup(['An', 'An'], [])).toBeNull()
})
