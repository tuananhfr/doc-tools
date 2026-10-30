import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument } from 'pdf-lib'

// Real BeVietnamPro font bytes come from `fetch('/assets/...')` at runtime, unavailable under
// vitest (no dev server) - so read the same TTF straight off disk instead, same precedent as
// `pdf-form.test.ts`. Unlike mocking in a WinAnsi standard font, this still exercises real
// Vietnamese glyph encoding (this content has combining diacritics like "Ẫ").
const REGULAR = readFileSync('src/assets/fonts/BeVietnamPro-Regular.ttf')
const BOLD = readFileSync('src/assets/fonts/BeVietnamPro-Bold.ttf')
vi.mock('@/features/tools/pdf/services/pdf-fonts', () => ({
  createFontLoader: (doc: PDFDocument) => {
    doc.registerFontkit(fontkit)
    return (key: string) => doc.embedFont(key === 'bold' ? BOLD : REGULAR, { subset: false })
  },
}))
import {
  createPihBrochureBooklet,
  createPihBrochurePages,
  createPihContractPair,
  createPihLpcProfileSample,
  createPihTechProfileSample,
} from './pih-pdf-samples'

async function pageCount(file: File): Promise<number> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  return doc.getPageCount()
}

describe('pih-pdf-samples', () => {
  it('tech profile sample (PDF edit) is a loadable 2-page PDF', async () => {
    const file = await createPihTechProfileSample()
    expect(file.type).toBe('application/pdf')
    expect(file.name).toBe('ubot-tech-profile-demo.pdf')
    expect(await pageCount(file)).toBe(2)
  })

  it('LPC profile sample (Convert) is a loadable 1-page PDF', async () => {
    const file = await createPihLpcProfileSample()
    expect(file.type).toBe('application/pdf')
    expect(await pageCount(file)).toBe(1)
  })

  it('brochure pages (Merge) are three separate single-page PDFs', async () => {
    const files = await createPihBrochurePages()
    expect(files).toHaveLength(3)
    for (const file of files) {
      expect(file.type).toBe('application/pdf')
      expect(await pageCount(file)).toBe(1)
    }
    // Each file is its own PDFDocument instance, independently loadable — no shared master object.
    const names = new Set(files.map((file) => file.name))
    expect(names.size).toBe(3)
  })

  it('brochure booklet (Split) is a single 6-page PDF', async () => {
    const file = await createPihBrochureBooklet()
    expect(await pageCount(file)).toBe(6)
  })

  it('contract pair (Compare) is two distinct, independently loadable 1-page PDFs', async () => {
    const [a, b] = await createPihContractPair()
    expect(await pageCount(a)).toBe(1)
    expect(await pageCount(b)).toBe(1)
    expect(a.name).not.toBe(b.name)
    // The two versions carry deliberately different clause text (term length, value, an
    // added clause) — proxy check that the encoded bytes differ, i.e. compare-pdf has
    // something real to detect instead of two identical files.
    const [bufA, bufB] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()])
    expect(bufA.byteLength).not.toBe(bufB.byteLength)
  })

  it('every call returns a fresh file (clone semantics: no shared mutable master)', async () => {
    const first = await createPihTechProfileSample()
    const second = await createPihTechProfileSample()
    expect(first).not.toBe(second)
    const [bufA, bufB] = await Promise.all([first.arrayBuffer(), second.arrayBuffer()])
    expect(new Uint8Array(bufA)).toEqual(new Uint8Array(bufB))
  })
})
