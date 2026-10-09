import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const runtime = 'nodejs'

// Only what the intro page's stylesheet names; never a path taken from the URL.
const FONTS = new Set(['BeVietnamPro-Regular.ttf', 'BeVietnamPro-Bold.ttf'])

/**
 * Fonts for the intro pages. Browsers fetch @font-face across origins with CORS, and those pages are
 * shown under host sites' domains, so this answers with Access-Control-Allow-Origin itself instead
 * of relying on the web server config.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  if (!FONTS.has(file)) return new Response('Not found', { status: 404 })
  const bytes = await readFile(path.join(process.cwd(), 'src/assets/fonts', file))
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'font/ttf', 'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin',
    },
  })
}
