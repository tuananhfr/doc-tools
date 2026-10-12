import { afterEach, describe, expect, it, vi } from 'vitest'
import { readTextSize, TEXT_SIZE_BOOT_SCRIPT, TEXT_SIZE_KEY, TEXT_SIZES, textSizeFromStorage, writeTextSize } from './text-size'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
    data,
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('textSizeFromStorage', () => {
  it('only the exact stored value turns large text on', () => {
    expect(textSizeFromStorage('large')).toBe('large')
    for (const raw of [null, '', 'normal', 'LARGE', ' large', '"large"', '{"size":"large"}']) expect(textSizeFromStorage(raw)).toBe('normal')
  })

  it('lists normal first so the menu shows the default on top', () => {
    expect(TEXT_SIZES).toEqual(['normal', 'large'])
  })
})

describe('readTextSize / writeTextSize', () => {
  it('round-trips through localStorage and clears the key for normal', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    writeTextSize('large')
    expect(storage.data.get(TEXT_SIZE_KEY)).toBe('large')
    expect(readTextSize()).toBe('large')
    writeTextSize('normal')
    expect(storage.data.has(TEXT_SIZE_KEY)).toBe(false)
    expect(readTextSize()).toBe('normal')
  })

  it('falls back to normal and never throws when storage is blocked or missing', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => { throw new Error('denied') } })
    expect(readTextSize()).toBe('normal')
    expect(() => writeTextSize('large')).not.toThrow()
    vi.unstubAllGlobals()
    vi.stubGlobal('localStorage', undefined)
    expect(readTextSize()).toBe('normal')
  })
})

describe('TEXT_SIZE_BOOT_SCRIPT', () => {
  it('reads the same key and guards storage access', () => {
    expect(TEXT_SIZE_BOOT_SCRIPT).toContain(JSON.stringify(TEXT_SIZE_KEY))
    expect(TEXT_SIZE_BOOT_SCRIPT.startsWith('try{')).toBe(true)
    expect(TEXT_SIZE_BOOT_SCRIPT).toContain("dataset.textSize='large'")
  })

  it('sets the attribute only for the stored large value', () => {
    const run = (stored: string | null) => {
      const root = { dataset: {} as Record<string, string> }
      new Function('localStorage', 'document', TEXT_SIZE_BOOT_SCRIPT)({ getItem: () => stored }, { documentElement: root })
      return root.dataset.textSize
    }
    expect(run('large')).toBe('large')
    expect(run(null)).toBeUndefined()
    expect(run('normal')).toBeUndefined()
  })
})
