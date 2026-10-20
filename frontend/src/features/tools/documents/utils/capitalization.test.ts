import { expect, it } from 'vitest'
import { capitalizeInitial } from './capitalization'

it('capitalizes Vietnamese initials without lowercasing existing names or acronyms', () => {
  expect(capitalizeInitial('  nguyễn văn an', true)).toBe('  Nguyễn Văn An')
  expect(capitalizeInitial('  quản lý hồ sơ. phối hợp nhóm\n- viết báo cáo')).toBe('  Quản lý hồ sơ. Phối hợp nhóm\n- Viết báo cáo')
  expect(capitalizeInitial('iOS, eBay và SQL')).toBe('iOS, eBay và SQL')
  expect(capitalizeInitial('kỹ năng\nviết báo cáo')).toBe('Kỹ năng\nViết báo cáo')
  expect(capitalizeInitial('')).toBe('')
})
