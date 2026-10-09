import { BRAND_NAME, DEFAULT_PICTURES, FOOTER_PAGES, LANDING_ANCHORS, PRIVACY_ICONS, STEP_ICONS, defaultToolsShot } from '../config/landing-defaults'
import { landingCss } from '../styles/landing-css'
import type { LandingDoc, LandingIcon, LandingTool, LandingUrls } from '../types/landing.types'
import { landingPalette } from '../utils/landing-theme'

/**
 * Plain string templates, not React: Next refuses react-dom/server inside a route handler, and the
 * admin preview feeds the very same string to an iframe. Every value from the page content goes
 * through `esc`; only `icon()` output (bootstrap-icons SVG from disk) and the CSS are raw.
 */
export const esc = (value: string) => value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)

const when = (value: string, html: (text: string) => string) => value ? html(esc(value)) : ''

export interface LandingRender { doc: LandingDoc; tools: LandingTool[]; urls: LandingUrls; icon: LandingIcon }

export function landingBodyHtml({ doc, tools, urls, icon }: LandingRender) {
  const picture = (id: string | null, fallback: string) => esc(id ? urls.asset(id) : urls.file(fallback))
  const page = (path: string) => esc(urls.page(path))
  const arrow = icon('arrow-right')
  const cta = esc(doc.hero.cta)
  const brand = `<a class="cnl-brand" href="${page('/')}"><img src="${picture(doc.theme.logo, DEFAULT_PICTURES.logo)}" alt="${doc.theme.logo ? esc(BRAND_NAME) : ''}">${doc.theme.logo ? '' : esc(BRAND_NAME)}</a>`
  const rows = (items: { icon: string; title: string; body: string; href?: string }[]) => `<ul class="cnl-rows">${items.map(item => {
    const copy = `<h3>${esc(item.title)}</h3>${when(item.body, text => `<p>${text}</p>`)}`
    return `<li>${icon(item.icon)}${item.href ? `<a href="${esc(item.href)}">${copy}</a>` : `<div>${copy}</div>`}</li>`
  }).join('')}</ul>`

  return `<a href="#cnl-main" class="cnl-skip">Bỏ qua, tới nội dung chính</a>
<header class="cnl-header"><div class="cnl-container cnl-header-inner">${brand}<nav class="cnl-nav" aria-label="Mục trên trang">${LANDING_ANCHORS.map(item => `<a href="#${item.id}">${esc(item.label)}</a>`).join('')}</nav><a class="cnl-button cnl-button--small" href="${page('/cong-cu')}">${cta}</a></div></header>
<main id="cnl-main">
<section class="cnl-hero" aria-labelledby="cnl-title"><img class="cnl-art" src="${picture(doc.hero.image, DEFAULT_PICTURES.hero)}" alt="" fetchpriority="high"><div class="cnl-container"><h1 id="cnl-title">${esc(doc.hero.title)}${when(doc.hero.highlight, text => `<span>${text}</span>`)}</h1>${when(doc.hero.body, text => `<p>${text}</p>`)}<div class="cnl-actions"><a class="cnl-button" href="${page('/cong-cu')}">${cta}${arrow}</a><a class="cnl-link" href="#cach-dung">Xem cách sử dụng</a></div></div></section>
<section id="tien-ich" class="cnl-section cnl-container" aria-labelledby="cnl-cases-title"><div class="cnl-heading"><h2 id="cnl-cases-title">${esc(doc.cases.title)}</h2>${when(doc.cases.body, text => `<p>${text}</p>`)}</div><div class="cnl-cases">${doc.cases.items.map((item, index) => `<article><img src="${picture(item.image, DEFAULT_PICTURES.cases[index] ?? DEFAULT_PICTURES.cases[0])}" alt="" loading="lazy" width="900" height="900"><h3>${esc(item.title)}</h3>${when(item.body, text => `<p>${text}</p>`)}<a class="cnl-link" href="${page('/' + item.target)}">${esc(item.linkLabel)}${arrow}</a></article>`).join('')}</div></section>
<section class="cnl-tools" aria-labelledby="cnl-tools-title"><div class="cnl-container cnl-section cnl-tools-inner"><figure class="cnl-shot"><img src="${picture(doc.tools.image, defaultToolsShot(doc.theme.mode))}" alt="" loading="lazy" width="1600" height="1000"></figure><div><h2 id="cnl-tools-title">${esc(doc.tools.title)}</h2>${when(doc.tools.body, text => `<p class="cnl-body">${text}</p>`)}${rows(tools.map(tool => ({ icon: tool.icon, title: tool.title, body: tool.body, href: urls.page('/' + tool.slug) })))}<a class="cnl-link" href="${page('/cong-cu')}">Xem tất cả công cụ${arrow}</a></div></div></section>
<section id="cach-dung" class="cnl-section cnl-container cnl-steps" aria-labelledby="cnl-steps-title"><div class="cnl-heading"><h2 id="cnl-steps-title">${esc(doc.steps.title)}</h2>${when(doc.steps.body, text => `<p>${text}</p>`)}</div><ol>${doc.steps.items.map((item, index) => `<li><span class="cnl-step-number">${index + 1}</span><span class="cnl-step-icon">${icon(STEP_ICONS[index] ?? STEP_ICONS[0])}</span><h3>${esc(item.title)}</h3>${when(item.body, text => `<p>${text}</p>`)}</li>`).join('')}</ol><a class="cnl-button" href="${page('/cong-cu')}">${cta}${arrow}</a>${when(doc.steps.note, text => `<p class="cnl-note">${text}</p>`)}</section>
<section id="du-lieu" class="cnl-privacy" aria-labelledby="cnl-privacy-title"><img class="cnl-art" src="${picture(doc.privacy.image, DEFAULT_PICTURES.privacy)}" alt="" loading="lazy"><div class="cnl-container cnl-section"><div class="cnl-privacy-copy"><h2 id="cnl-privacy-title">${esc(doc.privacy.title)}</h2>${when(doc.privacy.body, text => `<p class="cnl-body">${text}</p>`)}${rows(doc.privacy.items.map((item, index) => ({ icon: PRIVACY_ICONS[index] ?? PRIVACY_ICONS[0], title: item.title, body: item.body })))}<a class="cnl-link" href="${page('/xu-ly-du-lieu')}">Tìm hiểu cách xử lý dữ liệu${arrow}</a></div></div></section>
<section class="cnl-closing" aria-labelledby="cnl-closing-title"><img class="cnl-art" src="${picture(doc.closing.image, DEFAULT_PICTURES.closing)}" alt="" loading="lazy"><div class="cnl-container cnl-closing-copy"><h2 id="cnl-closing-title">${esc(doc.closing.title)}</h2>${when(doc.closing.body, text => `<p>${text}</p>`)}<a class="cnl-button cnl-button--inverse" href="${page('/cong-cu')}">${cta}${arrow}</a></div></section>
</main>
<footer class="cnl-footer"><div class="cnl-container"><div class="cnl-footer-main"><div>${brand}${when(doc.footer.tagline, text => `<p>${text}</p>`)}</div><nav aria-label="Liên kết Chuyện Nhỏ">${FOOTER_PAGES.map(item => `<a href="${page(item.path)}">${esc(item.label)}</a>`).join('')}</nav></div><div class="cnl-footer-bottom">Một sản phẩm từ ERPCons &amp; LPC</div></div></footer>`
}

export interface LandingDocumentRender extends LandingRender { selfUrl: string; fontUrl: (file: string) => string }

/** The whole page, styles inline and no script: a host site proxies this one response and nothing else. */
export function landingDocumentHtml(render: LandingDocumentRender) {
  const { doc, urls, selfUrl, fontUrl } = render
  const palette = landingPalette(doc.theme.accent, doc.theme.mode)
  // The host site's address is what people see, so search engines should credit that one.
  const canonical = esc(doc.canonicalUrl || selfUrl)
  const share = esc(doc.hero.image ? urls.asset(doc.hero.image) : urls.file(DEFAULT_PICTURES.hero))
  const title = esc(doc.meta.title)
  const description = when(doc.meta.description, text => `<meta name="description" content="${text}"><meta property="og:description" content="${text}">`)
  const favicon = esc(doc.theme.logo ? urls.asset(doc.theme.logo) : urls.file('/landing/icon.png'))
  return `<!doctype html><html lang="vi" data-theme="${palette.mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${description}<link rel="canonical" href="${canonical}"><meta name="theme-color" content="${palette.surface}"><meta name="color-scheme" content="${palette.mode}"><link rel="icon" href="${favicon}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${share}"><meta name="twitter:card" content="summary_large_image"><style>${landingCss(palette, fontUrl)}</style></head><body class="cnl">${landingBodyHtml(render)}</body></html>`
}
