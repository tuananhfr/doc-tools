import { describe, expect, it } from 'vitest'
import type { CollageSource, ImageSource, PageRef, PdfSource, SourceFile } from '../types/doc-tools.types'
import { groupByOrigin } from './batch-groups'

function pdf(id: string, name: string, originId?: string): PdfSource {
  return { id, name, originId, kind: 'pdf', mime: 'application/pdf', bytes: new Uint8Array(0), size: 0, pageCount: 3 }
}

function image(id: string, name: string): ImageSource {
  return { id, name, kind: 'image', mime: 'image/jpeg', bytes: new Uint8Array(0), size: 0, pageCount: 1 }
}

function page(id: string, sourceId: string, pageIndex = 0): PageRef {
  return { id, sourceId, pageIndex, rotation: 0 }
}

function bySource(...list: SourceFile[]): Record<string, SourceFile> {
  return Object.fromEntries(list.map((source) => [source.id, source]))
}

describe('groupByOrigin', () => {
  it('keeps derived pages with the file they came from, in arranged order', () => {
    const sources = bySource(pdf('a', 'Hợp đồng.pdf'), pdf('b', 'Biên bản.pdf'), pdf('a-crop', 'Hợp đồng.pdf', 'a'))
    const groups = groupByOrigin([page('b1', 'b'), page('a1', 'a'), page('a2', 'a-crop'), page('b2', 'b', 1)], sources)
    expect(groups.map((group) => group.name)).toEqual(['Biên bản', 'Hợp đồng'])
    expect(groups.map((group) => group.pages.map((entry) => entry.id))).toEqual([['b1', 'b2'], ['a1', 'a2']])
  })

  it('names a collage after its first image even when that image is no longer on the board', () => {
    const first = image('i1', 'Ảnh công trường.jpg')
    const collage: CollageSource = {
      id: 'c',
      name: 'gop.pdf',
      originId: 'i1',
      kind: 'collage',
      parts: [{ source: first, rotation: 0 }],
      size: 0,
      pageCount: 1,
    }
    const groups = groupByOrigin([page('c1', 'c')], bySource(collage))
    expect(groups).toEqual([{ name: 'Ảnh công trường', pages: [page('c1', 'c')] }])
  })

  it('numbers files that share a name so the zip does not overwrite one with the other', () => {
    const sources = bySource(pdf('a', 'Bao gia.pdf'), pdf('b', 'bao gia.pdf'), pdf('c', 'Bao gia.pdf'))
    const groups = groupByOrigin([page('a1', 'a'), page('b1', 'b'), page('c1', 'c')], sources)
    expect(groups.map((group) => group.name)).toEqual(['Bao gia', 'bao gia (2)', 'Bao gia (3)'])
  })

  it('skips pages whose source is gone', () => {
    expect(groupByOrigin([page('x', 'missing')], {})).toEqual([])
  })
})
