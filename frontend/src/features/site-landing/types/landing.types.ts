/** Mirror of backend/src/landings/landing-content.ts: a field added there is added here. */
export type LandingMode = 'light' | 'dark'

export interface LandingToolItem { slug: string; title: string; body: string }
export interface LandingCaseItem { title: string; body: string; image: string | null; target: string; linkLabel: string }
export interface LandingTextItem { title: string; body: string }

export interface LandingDoc {
  v: 1
  theme: { accent: string; mode: LandingMode; logo: string | null }
  canonicalUrl: string
  meta: { title: string; description: string }
  hero: { title: string; highlight: string; body: string; cta: string; image: string | null }
  tools: { title: string; body: string; image: string | null; items: LandingToolItem[] }
  cases: { title: string; body: string; items: LandingCaseItem[] }
  steps: { title: string; body: string; note: string; items: LandingTextItem[] }
  privacy: { title: string; body: string; image: string | null; items: LandingTextItem[] }
  closing: { title: string; body: string; image: string | null }
  footer: { tagline: string }
}

export interface PublishedLanding extends LandingDoc { key: string; publishedAt: number }

/** A tool card after the catalog filled in what staff left empty. */
export interface LandingTool { slug: string; icon: string; title: string; body: string }

/** Everything the page links to, as absolute URLs: it is served under other sites' domains. */
export interface LandingUrls {
  asset(id: string): string
  /** A DocTools page or tool, by path ("/cong-cu", "/ghep-pdf"). */
  page(path: string): string
  /** A file in DocTools' `public/` ("/landing/hero.webp"). */
  file(path: string): string
}

/** Markup for a Bootstrap icon by name. Inserted raw, so it must come from the icon files, never from page content. */
export type LandingIcon = (name: string) => string
