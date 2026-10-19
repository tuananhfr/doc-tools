import { describe, expect, it } from 'vitest'
import { matchesEcosystemService, splitEcosystemTitle } from './ecosystem-page'

describe('ecosystem page helpers', () => {
  it('splits the Vietnamese title into two display lines', () => {
    expect(splitEcosystemTitle('Khám phá hệ sinh thái')).toEqual(['Khám phá', 'hệ sinh thái'])
  })

  it('splits the English title case-insensitively', () => {
    expect(splitEcosystemTitle('Explore the ecosystem')).toEqual(['Explore the', 'ecosystem'])
  })

  it('does not split unrelated titles', () => {
    expect(splitEcosystemTitle('Khám phá dịch vụ')).toBeNull()
  })

  it('filters services by category and localized search text', () => {
    const service = { id: 'healthDigital', category: 'work' }
    expect(matchesEcosystemService(service, 'work', 'sức khỏe', 'Sức Khỏe Số Kiểm tra website')).toBe(true)
    expect(matchesEcosystemService(service, 'life', '', 'Sức Khỏe Số')).toBe(false)
    expect(matchesEcosystemService(service, 'all', 'không có', 'Sức Khỏe Số')).toBe(false)
  })
})
