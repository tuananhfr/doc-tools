import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (locale: string, namespace: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'messages', locale, namespace + '.json'), 'utf8'))
const pick = (value: unknown, dotted: string) => dotted.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), value)

// Khoá giao diện workspace (WP3): thiếu ở vi là build vỡ kiểu, thiếu ở en là 13 locale chép theo bị rỗng.
const KEYS: [string, string][] = [
  ['common', 'result.keepsInput'], ['documents', 'cv.photoFromHandoff'], ['image', 'shop.templates.seal'],
  ['image', 'shop.templates.gift'], ['image', 'shop.sealNotice'], ['image', 'handoff.toIdPhoto'], ['image', 'handoff.toCv'],
  ['image', 'mixedPhoto.addSize'], ['image', 'mixedPhoto.itemLabel'],
]

describe('WP3 workspace messages', () => {
  it.each(KEYS)('%s:%s exists in vi and en', (namespace, key) => {
    expect(typeof pick(read('vi', namespace), key)).toBe('string')
    expect(typeof pick(read('en', namespace), key)).toBe('string')
  })
})
