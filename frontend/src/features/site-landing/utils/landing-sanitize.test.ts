import { describe, expect, it } from 'vitest'
import { sanitizeLanding, sanitizePublished } from './landing-sanitize'

describe('sanitizeLanding', () => {
  it('drops an accent that could break out of the inline stylesheet', () => {
    const doc = sanitizeLanding({ theme: { accent: '#000;}</style><script>alert(1)</script>', mode: 'dark' } })
    expect(doc.theme.accent).toBe('#005be8')
    expect(doc.theme.mode).toBe('dark')
  })

  it('keeps only content-hash picture ids and plain slugs', () => {
    const id = 'a'.repeat(64)
    const doc = sanitizeLanding({
      hero: { image: '../../etc/passwd' }, theme: { logo: id },
      tools: { items: [{ slug: 'javascript:alert(1)' }, { slug: 'ghep-pdf' }] },
      cases: { items: [{ image: id, target: 'https://evil.test' }] },
    })
    expect(doc.hero.image).toBeNull()
    expect(doc.theme.logo).toBe(id)
    expect(doc.tools.items.map(item => item.slug)).toEqual(['cong-cu', 'ghep-pdf'])
    expect(doc.cases.items[0]).toMatchObject({ image: id, target: 'cong-cu' })
  })

  it('accepts only https canonical addresses (http on localhost for testing)', () => {
    expect(sanitizeLanding({ canonicalUrl: 'javascript:alert(1)' }).canonicalUrl).toBe('')
    expect(sanitizeLanding({ canonicalUrl: 'http://site.test/x' }).canonicalUrl).toBe('')
    expect(sanitizeLanding({ canonicalUrl: 'http://localhost:4000/x' }).canonicalUrl).toBe('http://localhost:4000/x')
    expect(sanitizeLanding({ canonicalUrl: 'https://site.test/chuyen-nho' }).canonicalUrl).toBe('https://site.test/chuyen-nho')
  })

  it('needs a valid key for a published page', () => {
    expect(sanitizePublished({ key: '../x' })).toBeNull()
    expect(sanitizePublished({ key: 'xay-dung', publishedAt: 5 })).toMatchObject({ key: 'xay-dung', publishedAt: 5 })
  })
})
