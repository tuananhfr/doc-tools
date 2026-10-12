import { describe, expect, it } from 'vitest'
import { DESIGN_TEMPLATES, SHOP_LAYOUTS } from '../config/graphic-templates'
import { THUMBNAIL_DPI, THUMBNAIL_SOURCE_EDGE, fitWithin, thumbnailJob } from './graphic-thumbnail-job'
import { graphicDimensions } from './graphic-layout'

const brand = { title: 'Shop', subtitle: '', accent: '#005bea', background: '#ffffff', fit: 'contain' as const }
const files = Array.from({ length: 8 }, (_, index) => new File(['image'], `item-${index}.jpg`))

describe('thumbnailJob', () => {
  it('draws the first sheet of each layout from the same eight photos (no re-upload)', () => {
    for (const template of SHOP_LAYOUTS) {
      const job = thumbnailJob({ brand, files, logo: null }, template)
      expect(job.template).toBe(template)
      expect(job.files).toEqual(files.slice(0, template.slots))
      expect(job.brand).toBe(brand)
    }
  })

  it('uses each template’s own size, not the custom size of the selected one', () => {
    const job = thumbnailJob({ brand, files: [], logo: null }, DESIGN_TEMPLATES[0])
    expect([job.template.widthMm, job.template.heightMm]).toEqual([DESIGN_TEMPLATES[0].widthMm, DESIGN_TEMPLATES[0].heightMm])
    expect(job.files).toEqual([])
  })

  it('renders every template at the thumbnail DPI without hitting the size guard', () => {
    for (const template of [...DESIGN_TEMPLATES, ...SHOP_LAYOUTS]) expect(() => graphicDimensions(template, THUMBNAIL_DPI)).not.toThrow()
  })
})

describe('fitWithin', () => {
  it('shrinks a phone photo to the proxy edge and keeps the ratio', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, THUMBNAIL_SOURCE_EDGE)).toEqual({ width: 320, height: 240 })
  })
  it('never enlarges and never returns zero', () => {
    expect(fitWithin({ width: 100, height: 50 }, 320)).toEqual({ width: 100, height: 50 })
    expect(fitWithin({ width: 1, height: 10000 }, 320)).toEqual({ width: 1, height: 320 })
  })
})
