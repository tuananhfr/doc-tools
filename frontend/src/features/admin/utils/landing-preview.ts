import { landingDocumentHtml, pickLandingTools, type LandingDoc, type LandingUrls } from '@/features/site-landing'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { withBase } from '@/utils/url'

const absolute = (pathname: string) => window.location.origin + withBase(pathname)

const PREVIEW_URLS: LandingUrls = {
  asset: id => absolute(`/api/v1/landings/assets/${id}`),
  page: pathname => absolute(pathname),
  file: pathname => absolute(pathname),
}

let iconCss: string | null = null

/**
 * The live page inlines icon SVGs read from disk on the server; the browser has no such files, so the preview
 * borrows the Bootstrap Icons font rules this admin page already loaded. Same glyphs, same size.
 */
function bootstrapIconCss() {
  if (iconCss !== null) return iconCss
  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList
    try { list = sheet.cssRules } catch { continue }
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSFontFaceRule ? /bootstrap-icons/.test(rule.style.getPropertyValue('font-family')) : rule instanceof CSSStyleRule && /(^|[\s,])(\.bi\b|\.bi-|\[class)/.test(rule.selectorText)) rules.push(rule.cssText)
    }
  }
  iconCss = rules.join('')
  return iconCss
}

const icon = (name: string) => /^[a-z0-9-]+$/.test(name) ? `<span class="cnl-icon" aria-hidden="true"><i class="bi bi-${name}"></i></span>` : ''

// Links stay inert: an in-frame click would load DocTools (or, for "#section" links, this admin page) inside the preview.
const PREVIEW_CSS = '.cnl-icon .bi{display:block;line-height:1}.cnl-icon .bi::before{display:block;line-height:1}a{pointer-events:none}'

/** The exact HTML the public route serves for this draft, minus the font-borrowing tweak above. */
export function landingPreviewHtml(doc: LandingDoc, key: string, catalog: readonly ToolDefinition[]) {
  const html = landingDocumentHtml({
    doc, tools: pickLandingTools(doc.tools.items, catalog), urls: PREVIEW_URLS, icon,
    selfUrl: absolute(`/gioi-thieu/${key}`), fontUrl: file => absolute(`/gioi-thieu/font/${file}`),
  })
  return html.replace('</head>', `<style>${bootstrapIconCss()}${PREVIEW_CSS}</style></head>`)
}
