/**
 * Message contract between ERPCons (host page) and an embedded Chuyện Nhỏ frame.
 * The SAME file lives in both repos: doc-tools `frontend/src/features/embed/embed-protocol.ts`
 * and erpcons_frontend `src/features/chuyen-nho/services/embed-protocol.ts`.
 * Change both together; bump EMBED_VERSION on any breaking change (the two sites deploy separately).
 */
export const EMBED_NS = 'cn-embed'
export const EMBED_VERSION = 1
export const MAX_SAVE_FILES = 20

export type EmbedTheme = 'light' | 'dark' | 'field'
export type EmbedCapability = 'cde' | 'ai' | 'trace'

export type GuestMessage =
  | { type: 'ready'; payload: { path: string; title: string } }
  | { type: 'navigate'; payload: { path: string } }
  | { type: 'dirty'; payload: { value: boolean } }
  | { type: 'save-to-cde'; payload: { files: File[] } }

export type HostMessage =
  | { type: 'init'; payload: { theme: EmbedTheme; capabilities: EmbedCapability[] } }
  | { type: 'theme'; payload: { mode: EmbedTheme } }

type Wrapped<M> = M & { ns: typeof EMBED_NS; v: typeof EMBED_VERSION }
type EventLike = Pick<MessageEvent, 'origin' | 'source' | 'data'>

const THEMES: readonly string[] = ['light', 'dark', 'field']
const CAPABILITIES: readonly string[] = ['cde', 'ai', 'trace']
// Path relative to the tools site root: lowercase slug segments + optional query. No scheme, no "//", no "..".
const PATH = /^(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?(?:\?[^#\s]*)?$/

export function wrap<M extends GuestMessage | HostMessage>(message: M): Wrapped<M> {
  return { ...message, ns: EMBED_NS, v: EMBED_VERSION }
}

export function isEmbedPath(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 512 && PATH.test(value)
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isTheme = (value: unknown): value is EmbedTheme => typeof value === 'string' && THEMES.includes(value)

let versionWarned = false

function unwrap(data: unknown): { type: unknown; payload: Record<string, unknown> } | null {
  if (!isRecord(data) || data.ns !== EMBED_NS) return null
  if (data.v !== EMBED_VERSION) {
    if (!versionWarned) {
      versionWarned = true
      console.warn(`[cn-embed] ignoring protocol v${String(data.v)}, this side speaks v${EMBED_VERSION}`)
    }
    return null
  }
  return isRecord(data.payload) ? { type: data.type, payload: data.payload } : null
}

export function readGuestMessage(data: unknown): GuestMessage | null {
  const message = unwrap(data)
  if (!message) return null
  const { payload } = message
  switch (message.type) {
    case 'ready':
      return isEmbedPath(payload.path) && typeof payload.title === 'string'
        ? { type: 'ready', payload: { path: payload.path, title: payload.title.slice(0, 200) } }
        : null
    case 'navigate':
      return isEmbedPath(payload.path) ? { type: 'navigate', payload: { path: payload.path } } : null
    case 'dirty':
      return typeof payload.value === 'boolean' ? { type: 'dirty', payload: { value: payload.value } } : null
    case 'save-to-cde': {
      const { files } = payload
      if (!Array.isArray(files) || files.length === 0 || files.length > MAX_SAVE_FILES) return null
      if (!files.every(item => typeof File !== 'undefined' && item instanceof File && item.name.length > 0)) return null
      return { type: 'save-to-cde', payload: { files } }
    }
    default:
      return null
  }
}

export function readHostMessage(data: unknown): HostMessage | null {
  const message = unwrap(data)
  if (!message) return null
  const { payload } = message
  switch (message.type) {
    case 'init':
      if (!isTheme(payload.theme) || !Array.isArray(payload.capabilities)) return null
      return {
        type: 'init',
        payload: {
          theme: payload.theme,
          capabilities: payload.capabilities.filter((item): item is EmbedCapability => typeof item === 'string' && CAPABILITIES.includes(item)),
        },
      }
    case 'theme':
      return isTheme(payload.mode) ? { type: 'theme', payload: { mode: payload.mode } } : null
    default:
      return null
  }
}

/** Host side: only the embedded frame's window, from the configured origin. */
export function acceptGuestEvent(event: EventLike, origin: string, frame: unknown): GuestMessage | null {
  if (!frame || event.origin !== origin || event.source !== frame) return null
  return readGuestMessage(event.data)
}

/** Guest side: only the direct parent, from the origin resolved at boot. */
export function acceptHostEvent(event: EventLike, origin: string, parent: unknown): HostMessage | null {
  if (!parent || event.origin !== origin || event.source !== parent) return null
  return readHostMessage(event.data)
}
