export const EMBED_PARAM = 'embed'
export const EMBED_HOST_ID = 'erpcons'
export const EMBED_THEME_PARAM = 'theme'
/** sessionStorage is per top-level browsing context + origin; safe because resolveEmbedHost refuses top-level documents and initEmbed clears the flag there. */
export const EMBED_STORAGE_KEY = 'cn.embed'

export interface EmbedProbe {
  search: string
  framed: boolean
  ancestorOrigin: string | null
  referrer: string
  stored: string | null
  hosts: readonly string[]
  selfOrigin?: string
}

function originOf(url: string): string | null {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

export function parseEmbedHosts(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(item => originOf(item.trim())).filter((item): item is string => Boolean(item))
}

/** Host origin when this document is framed by an allowed host that asked for embed mode; null otherwise. */
export function resolveEmbedHost(probe: EmbedProbe): string | null {
  if (!probe.framed) return null
  // Without ancestorOrigins (Firefox) an in-frame navigation leaves our own origin as referrer: parent is unknown then.
  const referrerOrigin = originOf(probe.referrer)
  const parent = probe.ancestorOrigin ?? (referrerOrigin !== null && referrerOrigin === probe.selfOrigin ? null : referrerOrigin)
  if (new URLSearchParams(probe.search).get(EMBED_PARAM) === EMBED_HOST_ID) {
    return parent && probe.hosts.includes(parent) ? parent : null
  }
  // A full reload inside the frame (locale switch, F5 in the iframe) loses the query string.
  if (!probe.stored || !probe.hosts.includes(probe.stored)) return null
  // Unknown parent is acceptable: embed mode only hides chrome, and postToHost targets the stored host, never the parent.
  return parent === null || parent === probe.stored ? probe.stored : null
}

/** Router location → path reported to the host: no leading slash, no embed-only params. */
export function toEmbedPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.delete(EMBED_PARAM)
  params.delete(EMBED_THEME_PARAM)
  const query = params.toString()
  return pathname.replace(/^\/+/, '') + (query ? `?${query}` : '')
}

/**
 * Inline <head> script: hides the site chrome before first paint (CSS keys off html[data-embed]).
 * Cosmetic only — `initEmbed()` makes the real, origin-checked decision and removes the flag if it fails.
 */
export const EMBED_BOOT_SCRIPT = `try{if(window.parent!==window&&(new URLSearchParams(location.search).get(${JSON.stringify(EMBED_PARAM)})===${JSON.stringify(EMBED_HOST_ID)}||sessionStorage.getItem(${JSON.stringify(EMBED_STORAGE_KEY)})))document.documentElement.dataset.embed=${JSON.stringify(EMBED_HOST_ID)}}catch(e){}`
