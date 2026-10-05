import { describe, expect, it } from 'vitest'
import type { PageRef } from '../types/doc-tools.types'
import type { FormField } from '../types/form.types'
import { pendingChanges, placeFields, sameValue } from './form-values'

const field = (name: string, extra: Partial<FormField> = {}): FormField => ({
  name,
  label: name,
  kind: 'text',
  value: '',
  options: [],
  multiline: false,
  readOnly: false,
  required: false,
  editable: false,
  multiSelect: false,
  pages: [0],
  ...extra,
})

const page = (id: string, sourceId: string, pageIndex: number): PageRef => ({ id, sourceId, pageIndex, rotation: 0 })

describe('sameValue', () => {
  it('compares selections regardless of order', () => {
    expect(sameValue(['b', 'a'], ['a', 'b'])).toBe(true)
    expect(sameValue(['a'], ['a', 'b'])).toBe(false)
    expect(sameValue('a', ['a'])).toBe(false)
    expect(sameValue(true, true)).toBe(true)
  })
})

describe('pendingChanges', () => {
  it('keeps only edits that differ from the file, never read-only fields', () => {
    const fields = [
      field('don_vi', { value: 'Cũ' }),
      field('so_hd', { value: '12' }),
      field('khoa', { readOnly: true }),
      field('chon', { kind: 'list', value: ['a'] }),
    ]
    expect(pendingChanges(fields, { don_vi: 'Mới', so_hd: '12', khoa: 'x', chon: ['a'], la: 'y' })).toEqual({ don_vi: 'Mới' })
    expect(pendingChanges(fields, undefined)).toEqual({})
  })
})

describe('placeFields', () => {
  it('orders by the current page order and hides fields on removed pages', () => {
    const fields = [field('p0'), field('p1', { pages: [1] }), field('p2', { pages: [2] }), field('p0b')]
    // Trang 2 của tệp được kéo lên đầu, trang 1 bị xoá, trang 0 bị nhân bản.
    const pages = [page('x', 'src', 2), page('y', 'src', 0), page('z', 'other', 1), page('w', 'src', 0)]
    const { placed, hidden } = placeFields(fields, 'src', pages)
    expect(placed.map((item) => [item.field.name, item.position])).toEqual([
      ['p2', 1],
      ['p0', 2],
      ['p0b', 2],
    ])
    expect(hidden).toBe(1)
  })
})
