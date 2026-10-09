import type { LandingDoc, PublishedLanding } from '../types/landing.types'

const HEX = /^#[0-9a-f]{6}$/i
const ASSET = /^[0-9a-f]{64}$/
const SLUG = /^[a-z0-9-]{1,64}$/

const text = (value: unknown) => typeof value === 'string' ? value : ''
const asset = (value: unknown) => typeof value === 'string' && ASSET.test(value) ? value : null
const slug = (value: unknown) => typeof value === 'string' && SLUG.test(value) ? value : 'cong-cu'
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []
const record = (value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

function https(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ? url.href : ''
  } catch { return '' }
}

/**
 * The backend already validates, but the accent goes into an inline stylesheet and ids into URLs,
 * so the page re-checks every value that is not rendered as escaped text.
 */
export function sanitizeLanding(input: unknown): LandingDoc {
  const doc = record(input)
  const theme = record(doc.theme)
  const meta = record(doc.meta), hero = record(doc.hero), tools = record(doc.tools), cases = record(doc.cases)
  const steps = record(doc.steps), privacy = record(doc.privacy), closing = record(doc.closing), footer = record(doc.footer)
  const plain = (items: unknown) => list(items).map(item => ({ title: text(item.title), body: text(item.body) }))
  return {
    v: 1,
    theme: { accent: typeof theme.accent === 'string' && HEX.test(theme.accent) ? theme.accent.toLowerCase() : '#005be8', mode: theme.mode === 'dark' ? 'dark' : 'light', logo: asset(theme.logo) },
    canonicalUrl: https(doc.canonicalUrl),
    meta: { title: text(meta.title) || 'Chuyện Nhỏ', description: text(meta.description) },
    hero: { title: text(hero.title), highlight: text(hero.highlight), body: text(hero.body), cta: text(hero.cta) || 'Mở công cụ', image: asset(hero.image) },
    tools: { title: text(tools.title), body: text(tools.body), image: asset(tools.image), items: list(tools.items).map(item => ({ slug: slug(item.slug), title: text(item.title), body: text(item.body) })) },
    cases: { title: text(cases.title), body: text(cases.body), items: list(cases.items).map(item => ({ title: text(item.title), body: text(item.body), image: asset(item.image), target: slug(item.target), linkLabel: text(item.linkLabel) || 'Xem công cụ' })) },
    steps: { title: text(steps.title), body: text(steps.body), note: text(steps.note), items: plain(steps.items) },
    privacy: { title: text(privacy.title), body: text(privacy.body), image: asset(privacy.image), items: plain(privacy.items) },
    closing: { title: text(closing.title), body: text(closing.body), image: asset(closing.image) },
    footer: { tagline: text(footer.tagline) },
  }
}

export function sanitizePublished(input: unknown): PublishedLanding | null {
  const raw = record(input)
  if (typeof raw.key !== 'string' || !SLUG.test(raw.key)) return null
  return { ...sanitizeLanding(raw), key: raw.key, publishedAt: Number(raw.publishedAt) || 0 }
}
