import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadToolCatalog } from '@/features/site/server/tool-catalog'
import { DEFAULT_LOCALE } from '@/i18n/locales'
import type { LandingTool, PublishedLanding } from '../types/landing.types'
import { pickLandingTools } from '../utils/landing-tools'
import { sanitizePublished } from '../utils/landing-sanitize'

// Server-side call straight to the API, not through the Next rewrite (which only exists for browsers).
const backendUrl = (process.env.BACKEND_URL ?? 'http://127.0.0.1:3003').replace(/\/+$/, '')

/** How long a published edit takes to show; host sites may cache on top of this. */
export const LANDING_REVALIDATE_SECONDS = 60

export type LandingLookup = { status: 'ok'; landing: PublishedLanding } | { status: 'missing' } | { status: 'unavailable' }

export async function fetchLanding(key: string): Promise<LandingLookup> {
  let response: Response
  try {
    response = await fetch(`${backendUrl}/api/v1/landings/${encodeURIComponent(key)}`, { next: { revalidate: LANDING_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) })
  } catch {
    return { status: 'unavailable' }
  }
  if (response.status === 404) return { status: 'missing' }
  if (!response.ok) return { status: 'unavailable' }
  const landing = sanitizePublished(((await response.json()) as { landing?: unknown }).landing)
  return landing ? { status: 'ok', landing } : { status: 'unavailable' }
}

export async function resolveTools(landing: PublishedLanding): Promise<LandingTool[]> {
  return pickLandingTools(landing.tools.items, await loadToolCatalog(DEFAULT_LOCALE))
}

const iconCache = new Map<string, Promise<string>>()

/** Bootstrap Icons as inline SVG: the icon font would be one more cross-origin file for host sites to load. */
export function loadIcon(name: string) {
  if (!/^[a-z0-9-]+$/.test(name)) return Promise.resolve('')
  let svg = iconCache.get(name)
  if (!svg) {
    svg = readFile(path.join(process.cwd(), 'node_modules/bootstrap-icons/icons', `${name}.svg`), 'utf8').catch(() => '')
    iconCache.set(name, svg)
  }
  return svg
}
