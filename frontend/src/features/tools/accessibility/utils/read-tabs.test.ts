import { describe, expect, it } from 'vitest'
import { readInputTabs } from './read-tabs'

describe('readInputTabs', () => {
  it('hides the link tab until WP4-B turns it on', () => {
    expect(readInputTabs(false)).toEqual(['text', 'file'])
    expect(readInputTabs(true)).toEqual(['text', 'file', 'link'])
  })
})
