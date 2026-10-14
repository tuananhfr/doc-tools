/**
 * Message contract between ERPCons (host page) and an embedded Chuyện Nhỏ frame.
 * The SAME file lives in both repos: doc-tools `frontend/src/features/embed/embed-protocol.ts`
 * and erpcons_frontend `src/features/chuyen-nho/services/embed-protocol.ts`.
 * Change both together; bump EMBED_VERSION on any breaking change (the two sites deploy separately).
 */
export const EMBED_NS = 'cn-embed'
export const EMBED_VERSION = 1
export const MAX_SAVE_FILES = 20

/** Host-side AI limits: must match erp_tools `ToolAiTasks` (maxChars, MAX_IMAGES, MAX_IMAGE_BYTES). */
export const AI_TEXT_MAX = 4000
export const AI_IMAGES_MAX = 10
export const AI_IMAGE_BYTES_MAX = 10 * 1024 * 1024
export const AI_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
/** Same cap as the host's trace lookup (`/trace/resolve?value=`). */
export const QR_TEXT_MAX = 2000

export const AI_TASKS = ['ask', 'check_electricity', 'check_payroll', 'check_address'] as const
export type AiTask = (typeof AI_TASKS)[number]
export const AI_ERRORS = ['rate-limited', 'invalid', 'failed', 'timeout'] as const
export type AiErrorCode = (typeof AI_ERRORS)[number]

export type EmbedTheme = 'light' | 'dark' | 'field'
export type EmbedCapability = 'cde' | 'ai' | 'trace'

export interface AiJob {
  id: string
  task: AiTask
  text: string
  images: File[]
}

export type AiResult = { id: string; ok: true; text: string } | { id: string; ok: false; error: AiErrorCode }

export type GuestMessage =
  | { type: 'ready'; payload: { path: string; title: string } }
  | { type: 'navigate'; payload: { path: string } }
  | { type: 'dirty'; payload: { value: boolean } }
  | { type: 'save-to-cde'; payload: { files: File[] } }
  | { type: 'ai-job'; payload: AiJob }
  | { type: 'qr-scanned'; payload: { text: string } }

export type HostMessage =
  | { type: 'init'; payload: { theme: EmbedTheme; capabilities: EmbedCapability[] } }
  | { type: 'theme'; payload: { mode: EmbedTheme } }
  | { type: 'ai-result'; payload: AiResult }

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
// Guest-generated correlation id (a UUID in practice); only compared, never interpreted.
const JOB_ID = /^[A-Za-z0-9-]{1,64}$/
const isJobId = (value: unknown): value is string => typeof value === 'string' && JOB_ID.test(value)
const isAiTask = (value: unknown): value is AiTask => typeof value === 'string' && (AI_TASKS as readonly string[]).includes(value)
const isAiError = (value: unknown): value is AiErrorCode => typeof value === 'string' && (AI_ERRORS as readonly string[]).includes(value)

export function isAiImage(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File && AI_IMAGE_TYPES.includes(value.type) && value.size > 0 && value.size <= AI_IMAGE_BYTES_MAX
}

function readAiJob(payload: Record<string, unknown>): AiJob | null {
  const { id, task, text } = payload
  const images: unknown = payload.images ?? []
  if (!isJobId(id) || !isAiTask(task)) return null
  if (typeof text !== 'string' || text.trim() === '' || text.length > AI_TEXT_MAX) return null
  if (!Array.isArray(images) || images.length > AI_IMAGES_MAX || !images.every(isAiImage)) return null
  // Only `ask` takes images on the host; the check tasks would silently drop them.
  if (images.length > 0 && task !== 'ask') return null
  return { id, task, text, images }
}

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
    case 'ai-job': {
      const job = readAiJob(payload)
      return job ? { type: 'ai-job', payload: job } : null
    }
    case 'qr-scanned':
      return typeof payload.text === 'string' && payload.text.trim() !== '' && payload.text.length <= QR_TEXT_MAX
        ? { type: 'qr-scanned', payload: { text: payload.text } }
        : null
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
    case 'ai-result':
      if (!isJobId(payload.id)) return null
      if (payload.ok === true && typeof payload.text === 'string') return { type: 'ai-result', payload: { id: payload.id, ok: true, text: payload.text } }
      if (payload.ok === false && isAiError(payload.error)) return { type: 'ai-result', payload: { id: payload.id, ok: false, error: payload.error } }
      return null
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
