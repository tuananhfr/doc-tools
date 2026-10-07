/**
 * Images only: GoClaw sends them inline to the member's own model. Everything else GoClaw reads
 * with a provider picked by NAME across the tenant (read_document/read_audio), and text files are
 * also summarised by the tenant's background provider through the vault, so text attachments are
 * read in the browser and travel inside the message instead.
 */
export const UPLOAD_TYPES = [
  { mime: 'image/png', extensions: ['.png'], magic: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'], magic: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', extensions: ['.webp'], magic: (b: Buffer) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  { mime: 'image/gif', extensions: ['.gif'], magic: (b: Buffer) => /^GIF8[79]a$/.test(b.toString('latin1', 0, 6)) },
] as const

export type UploadMime = (typeof UPLOAD_TYPES)[number]['mime']

const MAX_NAME_LENGTH = 120

function extensionOf(name: string) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}

/** Display name only: it never becomes a path, the file is stored under its upload id. */
export function cleanFilename(raw: string) {
  const base = raw.split(/[\\/]/).pop() ?? ''
  // eslint-disable-next-line no-control-regex
  const name = base.replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '').replace(/\s+/g, ' ').trim()
  if (name.length <= MAX_NAME_LENGTH) return name
  const extension = extensionOf(name)
  return name.slice(0, MAX_NAME_LENGTH - extension.length) + extension
}

/** The extension picks the type and the bytes must agree. */
export function detectUploadType(filename: string, bytes: Buffer): UploadMime | null {
  const extension = extensionOf(filename)
  const type = UPLOAD_TYPES.find((entry) => (entry.extensions as readonly string[]).includes(extension))
  return type && bytes.length > 0 && type.magic(bytes) ? type.mime : null
}
