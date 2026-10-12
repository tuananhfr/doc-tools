import { describe, expect, it } from 'vitest'
import { decodeTextFile, mergePdfPages, pastedSource, readErrorFromTool, readFileKind, splitReadParts, toFileSource } from './read-source'

const bytes = (...values: number[]) => new Uint8Array(values)
const utf8 = (text: string) => new TextEncoder().encode(text)

describe('readFileKind', () => {
  it('sniffs PDF and zip/OLE headers before trusting the name', () => {
    expect(readFileKind('a.bin', '', bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe('pdf')
    expect(readFileKind('truyen.docx', '', bytes(0x50, 0x4b, 0x03, 0x04))).toBe('docx')
    expect(readFileKind('anh.zip', '', bytes(0x50, 0x4b, 0x03, 0x04))).toBeNull()
    expect(readFileKind('cu.doc', '', bytes(0xd0, 0xcf, 0x11, 0xe0))).toBe('legacy-doc')
  })

  it('accepts plain text by extension or mime and rejects images', () => {
    expect(readFileKind('TRUYEN.TXT', '', bytes(0x41))).toBe('txt')
    expect(readFileKind('ghi-chu', 'text/plain', bytes(0x41))).toBe('txt')
    expect(readFileKind('anh.jpg', 'image/jpeg', bytes(0xff, 0xd8))).toBeNull()
  })
})

describe('decodeTextFile', () => {
  it('drops a UTF-8 BOM and normalises line endings', () => {
    expect(decodeTextFile(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('Xin chào\r\nbà')]))).toEqual({ ok: true, text: 'Xin chào\nbà', encoding: 'utf-8' })
  })

  it('reads UTF-16LE with a BOM', () => {
    expect(decodeTextFile(new Uint8Array([0xff, 0xfe, ...Buffer.from('Hà Nội', 'utf16le')]))).toEqual({ ok: true, text: 'Hà Nội', encoding: 'utf-16le' })
  })

  it('falls back to windows-1258 when the bytes are not UTF-8, composing the tone marks', () => {
    // "Tiếng Việt" theo windows-1258: dấu thanh là ký tự tổ hợp riêng (0xEC sắc, 0xF2 nặng).
    expect(decodeTextFile(bytes(0x54, 0x69, 0xea, 0xec, 0x6e, 0x67, 0x20, 0x56, 0x69, 0xea, 0xf2, 0x74))).toEqual({ ok: true, text: 'Tiếng Việt', encoding: 'windows-1258' })
  })

  it('composes decomposed UTF-8 (NFD from macOS)', () => {
    expect(decodeTextFile(utf8('Vie\u0302\u0323t'))).toEqual({ ok: true, text: 'Việt', encoding: 'utf-8' })
  })

  it('rejects binary content with NUL bytes (also UTF-16 without a BOM)', () => {
    expect(decodeTextFile(bytes(0x41, 0x00, 0x42))).toEqual({ ok: false, code: 'UNSUPPORTED' })
    expect(decodeTextFile(new Uint8Array(Buffer.from('Hà', 'utf16le')))).toEqual({ ok: false, code: 'UNSUPPORTED' })
  })
})

describe('splitReadParts', () => {
  it('keeps short text in one part, empty text as one empty part', () => {
    expect(splitReadParts('ngắn', 40)).toEqual([{ start: 0, end: 4 }])
    expect(splitReadParts('', 40)).toEqual([{ start: 0, end: 0 }])
  })

  it('cuts after a paragraph break when it is in the second half', () => {
    expect(splitReadParts('a'.repeat(30) + '\n' + 'b'.repeat(30), 40)).toEqual([{ start: 0, end: 31 }, { start: 31, end: 61 }])
  })

  it('cuts after a sentence, never over the limit, parts contiguous and covering everything', () => {
    const story = 'Ngày xưa có một cô bé. '.repeat(10)
    const parts = splitReadParts(story, 100)
    expect(parts.every((part) => part.end - part.start <= 100)).toBe(true)
    expect(parts.every((part, index) => index === 0 || parts[index - 1].end === part.start)).toBe(true)
    expect(parts.at(-1)?.end).toBe(story.length)
    expect(story.slice(parts[0].start, parts[0].end).endsWith('cô bé. ')).toBe(true)
  })

  it('hard-cuts text without any break', () => {
    expect(splitReadParts('x'.repeat(100), 40)).toEqual([{ start: 0, end: 40 }, { start: 40, end: 80 }, { start: 80, end: 100 }])
  })
})

describe('sources', () => {
  it('merges text pages and reviewed OCR pages in page order, skipping blanks', () => {
    expect(mergePdfPages(['Trang 1', null, '  ', null], new Map([[1, 'Trang 2 scan']]))).toBe('Trang 1\n\nTrang 2 scan')
  })

  it('builds a pasted source, flagging and clipping text over the hard limit', () => {
    expect(pastedSource('   ')).toBeNull()
    expect(pastedSource('abc')).toEqual({ kind: 'text', title: '', text: 'abc', warnings: [] })
    expect(pastedSource('abc', 2)).toEqual({ kind: 'text', title: '', text: 'ab', warnings: ['TOO_LARGE'] })
  })

  it('builds a file source or says why not', () => {
    expect(toFileSource('a.txt', '  Xin chào  ')).toEqual({ ok: true, source: { kind: 'file', title: 'a.txt', text: 'Xin chào', warnings: [] } })
    expect(toFileSource('a.txt', ' ... — ')).toEqual({ ok: false, code: 'NO_ARTICLE' })
    expect(toFileSource('a.txt', 'abcdef', 3)).toEqual({ ok: false, code: 'TOO_LARGE' })
  })

  it('maps tool error codes from PDF ingest to read error codes', () => {
    expect(readErrorFromTool('FILE_TOO_LARGE')).toBe('TOO_LARGE')
    expect(readErrorFromTool('MEMORY_LIMIT')).toBe('TOO_LARGE')
    expect(readErrorFromTool('CORRUPT_FILE')).toBe('UNSUPPORTED')
    expect(readErrorFromTool('PERMISSION_DENIED')).toBe('UNSUPPORTED')
  })
})
