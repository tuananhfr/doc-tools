import { expect, it } from 'vitest'
import { admissionScore, convertGrade } from './grades'

it('converts grade bands and adjusts admission bonus above 22.5', () => {
  expect(convertGrade(8.5)).toEqual({ letter: 'A', gradePoint: 4 })
  expect(convertGrade(10.1)).toBeNull()
  expect(admissionScore([8, 8, 8], 0.5, 1)).toEqual({ raw: 24, fullBonus: 1.5, adjustedBonus: 1.2, total: 25.2 })
})
