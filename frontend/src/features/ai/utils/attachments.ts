/**
 * What the chat accepts. Images go to our server and GoClaw fetches them for the member's own model.
 * Text is read here and travels inside the message: sent to GoClaw as a file, it would also be
 * summarised by the tenant's background model, which is not the member's key.
 */
export const ATTACHMENT_LIMITS = {
  maxFiles: 4,
  /** Matches the backend cap; GoClaw cuts media URLs off at 10 MiB without saying so. */
  imageBytes: 10 * 1024 * 1024,
  textBytes: 256 * 1024,
  /** Every character is billed on the member's key with each later turn of the chat. */
  textChars: 40_000,
} as const

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json']

export const ATTACHMENT_ACCEPT = [...IMAGE_EXTENSIONS, ...TEXT_EXTENSIONS].join(',')

export type AttachmentKind = 'image' | 'text'

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}

export function attachmentKind(name: string): AttachmentKind | null {
  const extension = extensionOf(name)
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image'
  if (TEXT_EXTENSIONS.includes(extension)) return 'text'
  return null
}

/** Strict UTF-8 without NUL bytes, so a renamed binary is refused rather than sent as gibberish. */
export function decodeText(bytes: Uint8Array): string | null {
  if (bytes.includes(0)) return null
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
  } catch {
    return null
  }
}

// eslint-disable-next-line no-control-regex
const cleanName = (name: string) => name.replace(/[\u0000-\u001f\u007f"`]/g, '').trim().slice(0, 120) || 'file'

/** The fence is longer than any backtick run inside, so the file cannot close its own block. */
export function fileBlock(name: string, content: string) {
  const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}cn-file name="${cleanName(name)}"\n${content.replace(/\n$/, '')}\n${fence}`
}

export function composeMessage(text: string, files: { name: string; content: string }[]) {
  return [text.trim(), ...files.map((file) => fileBlock(file.name, file.content))].filter(Boolean).join('\n\n')
}

export interface UserMessageParts { text: string; files: { name: string; lines: number }[] }

// GoClaw prepends `<media:image>`-style tags to the stored message; they are for the model only.
const MEDIA_TAG_LINE = /^(?:<media:[a-z]+\b[^>\n]*>\s*)+$/
const FILE_BLOCK = /^(`{3,})cn-file name="([^"\n]*)"\n([\s\S]*?)\n\1[ \t]*$/gm

/** A sent message as its author wrote it: typed text, and attached text files reduced to their names. */
export function splitUserMessage(content: string): UserMessageParts {
  const files: UserMessageParts['files'] = []
  const withoutFiles = content.replace(FILE_BLOCK, (_block, _fence, name: string, body: string) => {
    files.push({ name, lines: body.split('\n').length })
    return ''
  })
  const text = withoutFiles.split('\n').filter((line) => !MEDIA_TAG_LINE.test(line.trim())).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { text, files }
}

const UUID_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.\w+)?$/i

/** GoClaw stores a copy as `<uuid>.<ext>` or `<name>-<8 hex>.<ext>`; neither suffix means anything to people. */
function displayName(stored: string) {
  if (!stored || UUID_NAME.test(stored)) return ''
  return stored.replace(/-[0-9a-f]{8}(\.\w+)$/i, '$1')
}

interface RawMediaRef { kind?: unknown; path?: unknown; mime_type?: unknown }

/**
 * `sessions.preview` signs media paths (`/v1/files/…?ft=`, valid a few minutes) relative to GoClaw's
 * HTTP root. Only those become links; anything else in the history is ignored.
 */
export function toChatMedia(raw: unknown, filesUrl: string) {
  if (!Array.isArray(raw) || !filesUrl) return []
  return (raw as RawMediaRef[]).flatMap((ref) => {
    const path = typeof ref?.path === 'string' ? ref.path : ''
    if (!path.startsWith('/v1/files/')) return []
    const last = path.split('?')[0].split('/').pop() ?? ''
    let name = last
    try { name = decodeURIComponent(last) } catch { /* keep the raw segment */ }
    const kind: 'image' | 'file' = ref.kind === 'image' ? 'image' : 'file'
    return [{ kind, url: filesUrl.replace(/\/+$/, '') + path, name: displayName(name) }]
  })
}
