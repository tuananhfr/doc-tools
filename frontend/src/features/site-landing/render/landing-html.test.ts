import { describe, expect, it } from 'vitest'
import type { LandingDoc, LandingTool, LandingUrls } from '../types/landing.types'
import { landingDocumentHtml } from './landing-html'

const urls: LandingUrls = {
  asset: id => `https://lpc.vn/doc-tools/api/v1/landings/assets/${id}`,
  page: path => `https://lpc.vn/doc-tools${path}`,
  file: path => `https://lpc.vn/doc-tools${path}`,
}
const item = { title: 'Mục', body: 'Mô tả' }
const doc: LandingDoc = {
  v: 1, theme: { accent: '#c8102e', mode: 'light', logo: null }, canonicalUrl: '',
  meta: { title: 'Xây dựng "nhẹ" & nhanh', description: '' },
  hero: { title: '<script>alert(1)</script>', highlight: 'giải quyết', body: '', cta: 'Mở công cụ', image: null },
  tools: { title: 'Công cụ', body: '', image: null, items: [] },
  cases: { title: 'Tình huống', body: '', items: [{ title: 'A', body: '', image: 'b'.repeat(64), target: 'gia-dinh', linkLabel: 'Xem' }] },
  steps: { title: 'Các bước', body: '', note: '', items: [item, item, item] },
  privacy: { title: 'Dữ liệu', body: '', image: null, items: [item, item, item] },
  closing: { title: 'Kết', body: '', image: null }, footer: { tagline: '' },
}
const tools: LandingTool[] = [{ slug: 'huong-nha-la-ban', icon: 'compass', title: "Hướng nhà <i>'la bàn'</i>", body: '' }]
const render = (change: Partial<LandingDoc> = {}) => landingDocumentHtml({
  doc: { ...doc, ...change }, tools, urls, icon: name => `<svg data-icon="${name}"></svg>`,
  selfUrl: 'https://lpc.vn/doc-tools/gioi-thieu/xay-dung', fontUrl: file => `https://lpc.vn/doc-tools/gioi-thieu/font/${file}`,
})

describe('landingDocumentHtml', () => {
  it('escapes page content in text and attributes', () => {
    const html = render()
    expect(html).not.toContain('<script>')
    expect(html).toContain('&#60;script&#62;alert(1)&#60;/script&#62;')
    expect(html).toContain('<title>Xây dựng &#34;nhẹ&#34; &#38; nhanh</title>')
    expect(html).toContain('Hướng nhà &#60;i&#62;&#39;la bàn&#39;&#60;/i&#62;')
  })

  it('links only to absolute DocTools URLs so it works under another domain', () => {
    const html = render()
    const links = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(match => match[1])
    expect(links.filter(link => !link.startsWith('#') && !link.startsWith('https://lpc.vn/doc-tools/'))).toEqual([])
    expect(html).toContain('href="https://lpc.vn/doc-tools/huong-nha-la-ban"')
    expect(html).toContain(`src="https://lpc.vn/doc-tools/api/v1/landings/assets/${'b'.repeat(64)}"`)
    expect(html).not.toContain('<script')
  })

  it('credits the host site address when one is set', () => {
    expect(render()).toContain('<link rel="canonical" href="https://lpc.vn/doc-tools/gioi-thieu/xay-dung">')
    expect(render({ canonicalUrl: 'https://site-xay-dung.vn/chuyen-nho' })).toContain('<link rel="canonical" href="https://site-xay-dung.vn/chuyen-nho">')
  })

  it('carries the accent and theme into the inline stylesheet', () => {
    const html = render({ theme: { accent: '#c8102e', mode: 'dark', logo: null } })
    expect(html).toContain('data-theme="dark"')
    expect(html).toContain('--cnl-accent:#c8102e')
  })
})

describe('landing stylesheet', () => {
  it('keeps element resets at zero specificity so component rules win', () => {
    // `.cnl a{color:inherit}` once beat `.cnl-button` and left a white label on a white button.
    const css = render().match(/<style>([\s\S]*)<\/style>/)?.[1] ?? ''
    expect(css).not.toMatch(/(^|\})\.cnl (a|img|\*)[{,]/m)
    expect(css).not.toContain('.cnl :is(h1')
    expect(css).toContain(':where(.cnl) a{color:inherit')
  })
})
