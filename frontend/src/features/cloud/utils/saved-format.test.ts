import { describe, expect, it } from 'vitest'
import { savedItemPath } from './saved-format'

describe('saved item links', () => {
  it('adds the item to the tool path, keeping its own query', () => {
    expect(savedItemPath('/tien-dien', 'a b')).toBe('/tien-dien?saved=a%20b')
    expect(savedItemPath('/cong-cu-x?mode=water', 'id')).toBe('/cong-cu-x?mode=water&saved=id')
  })
})
