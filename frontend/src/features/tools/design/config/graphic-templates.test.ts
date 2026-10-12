import { describe, expect, it } from 'vitest'
import vi from '../../../../i18n/messages/vi/image.json'
import en from '../../../../i18n/messages/en/image.json'
import { DESIGN_TEMPLATES, SHOP_LAYOUTS } from './graphic-templates'
import { graphicDimensions } from '../utils/graphic-layout'

describe('design templates', () => {
  it('offers the decorative seal and the gift card', () => {
    expect(DESIGN_TEMPLATES.map(template => template.id)).toEqual(expect.arrayContaining(['seal', 'gift']))
  })

  it('has unique ids', () => {
    const ids = [...DESIGN_TEMPLATES, ...SHOP_LAYOUTS].map(template => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names every template kind in vi and en', () => {
    for (const template of [...DESIGN_TEMPLATES, ...SHOP_LAYOUTS]) {
      expect((vi.shop.templates as Record<string, string>)[template.kind]).toBeTruthy()
      expect((en.shop.templates as Record<string, string>)[template.kind]).toBeTruthy()
    }
  })

  it('prints at 300 DPI and draws 30 DPI thumbnails for the new templates', () => {
    for (const id of ['seal', 'gift']) {
      const template = DESIGN_TEMPLATES.find(item => item.id === id)!
      expect(() => graphicDimensions(template, 300)).not.toThrow()
      expect(() => graphicDimensions(template, 30)).not.toThrow()
    }
  })
})
