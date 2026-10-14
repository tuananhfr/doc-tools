import { describe, expect, it } from 'vitest'
import { addAiImages } from './ai-images'
import { AI_IMAGE_BYTES_MAX, AI_IMAGES_MAX } from './embed-protocol'

const img = (name: string, type = 'image/png', size = 3) => new File([new Uint8Array(size)], name, { type })

describe('addAiImages', () => {
  it('keeps accepted images after the current ones', () => {
    const first = img('a.png')
    const result = addAiImages([first], [img('b.jpg', 'image/jpeg'), img('c.webp', 'image/webp')])
    expect(result.images.map((file) => file.name)).toEqual(['a.png', 'b.jpg', 'c.webp'])
    expect(result.rejected).toEqual([])
  })

  it('rejects wrong types, empty and oversized files', () => {
    const result = addAiImages([], [img('d.pdf', 'application/pdf'), img('e.png', 'image/png', 0), img('f.png', 'image/png', AI_IMAGE_BYTES_MAX + 1), img('g.png')])
    expect(result.images.map((file) => file.name)).toEqual(['g.png'])
    expect(result.rejected.map((file) => file.name)).toEqual(['d.pdf', 'e.png', 'f.png'])
  })

  it('stops at the host limit', () => {
    const current = Array.from({ length: AI_IMAGES_MAX - 1 }, (_, index) => img(`${index}.png`))
    const result = addAiImages(current, [img('last.png'), img('extra.png')])
    expect(result.images).toHaveLength(AI_IMAGES_MAX)
    expect(result.rejected.map((file) => file.name)).toEqual(['extra.png'])
  })
})
