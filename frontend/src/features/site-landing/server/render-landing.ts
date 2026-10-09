import { appConfig } from '@/config/app.config'
import { withBase } from '@/utils/url'
import { PRIVACY_ICONS, STEP_ICONS } from '../config/landing-defaults'
import { esc, landingDocumentHtml } from '../render/landing-html'
import type { LandingUrls, PublishedLanding } from '../types/landing.types'
import { loadIcon, resolveTools } from './load-landing'

const origin = appConfig.siteUrl.replace(/\/+$/, '')
/** Absolute on purpose: relative URLs would resolve against the host site that proxies the page. */
const absolute = (pathname: string) => origin + withBase(pathname)

export const LANDING_URLS: LandingUrls = {
  asset: id => absolute(`/api/v1/landings/assets/${id}`),
  page: pathname => absolute(pathname),
  file: pathname => absolute(pathname),
}

export const landingFontUrl = (file: string) => absolute(`/gioi-thieu/font/${file}`)

export async function renderLanding(landing: PublishedLanding) {
  const tools = await resolveTools(landing)
  const names = ['arrow-right', ...STEP_ICONS, ...PRIVACY_ICONS, ...tools.map(tool => tool.icon)]
  const svgs = new Map(await Promise.all(names.map(async name => [name, await loadIcon(name)] as const)))
  const icon = (name: string) => `<span class="cnl-icon" aria-hidden="true">${svgs.get(name) ?? ''}</span>`
  return landingDocumentHtml({ doc: landing, tools, urls: LANDING_URLS, icon, selfUrl: absolute(`/gioi-thieu/${landing.key}`), fontUrl: landingFontUrl })
}

export function landingErrorPage(title: string, message: string) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:'Segoe UI',Arial,sans-serif;background:#fbfcfe;color:#0c254d;text-align:center;padding:24px}a{color:#005be8}</style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="${esc(absolute('/cong-cu'))}">Mở Chuyện Nhỏ</a></p></main></body></html>`
}
