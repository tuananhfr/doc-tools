import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement, Fragment, isValidElement, type ReactNode } from 'react'
import sharp from 'sharp'
import { ToolIllustration } from '@/features/tools/hub/components/ToolIllustration'
import { ToolOutlineIllustration } from '@/features/tools/hub/components/ToolOutlineIllustration'
import { toolArtworkStyle, type ArtworkTone } from '@/features/tools/hub/config/tool-artwork'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { TOOL_ICON_VARIANTS, type ToolIconVariant } from '../config/tool-app'

/**
 * Icon màn hình chính của MỘT công cụ, vẽ lại đúng hình trên thẻ công cụ (`ToolArtwork`) để
 * icon cài ra khớp với cái người dùng thấy trong app. Rasterize bằng sharp (librsvg) vì hình
 * minh hoạ có chữ (W, X, P, 123, GIF) — resvg của `next/og` không có font cho chữ trong SVG lồng.
 */

const NAVY = '#071f50'
const BADGE = '#ef162b'
/** `--art-*` trong `styles/site/tool-artwork.css` + nền thẻ `--tile-tint` (directory-studio.css; vàng không có nên tự đặt). */
const TONES: Record<ArtworkTone, { light: string; main: string; dark: string; tint: string }> = {
  blue: { light: '#dceeff', main: '#0879ef', dark: '#071f50', tint: '#e3f0ff' },
  red: { light: '#ff6d7b', main: '#f72e4f', dark: '#df153b', tint: '#ffe6e8' },
  teal: { light: '#4cce9c', main: '#06a375', dark: '#078762', tint: '#dcf7ec' },
  purple: { light: '#ae78ff', main: '#8835ed', dark: '#6a26d6', tint: '#efe3ff' },
  pink: { light: '#ff79c4', main: '#f52a97', dark: '#dc1580', tint: '#ffe3f3' },
  orange: { light: '#ffc052', main: '#ff9414', dark: '#ec7400', tint: '#fff0d6' },
  yellow: { light: '#ffe477', main: '#ffce25', dark: '#efb615', tint: '#fff6cc' },
}
const ILLUSTRATED = new Set(['cards', 'tarot', 'lotus', 'wheel'])

/** Thuộc tính SVG giữ nguyên chữ hoa; còn lại camelCase của React → kebab-case (`strokeWidth` → `stroke-width`). */
const CAMEL_ATTRIBUTES = new Set(['viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'patternUnits'])
const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/**
 * Hình minh hoạ của thẻ công cụ (chỉ gồm thẻ SVG, Fragment, mảng) → chuỗi SVG. Next không cho route
 * import `react-dom/server`, mà các hình này đủ đơn giản để tự chuyển.
 */
function svgMarkup(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return escapeAttribute(String(node))
  if (Array.isArray(node)) return node.map(svgMarkup).join('')
  if (!isValidElement<Record<string, unknown>>(node)) return ''
  const { type, props } = node
  if (type === Fragment) return svgMarkup(props.children as ReactNode)
  if (typeof type === 'function') return svgMarkup((type as (p: unknown) => ReactNode)(props))
  if (typeof type !== 'string') return ''
  const attributes = Object.entries(props)
    .filter(([name, value]) => name !== 'children' && value !== undefined && value !== null && value !== false)
    .map(([name, value]) => `${name === 'className' ? 'class' : CAMEL_ATTRIBUTES.has(name) ? name : name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())}="${escapeAttribute(String(value))}"`)
  return `<${type}${attributes.length ? ' ' + attributes.join(' ') : ''}>${svgMarkup(props.children as ReactNode)}</${type}>`
}

let symbolSprite: Promise<Map<string, string>> | null = null

/** `public/tool-icons/symbols.svg` (bộ ký hiệu đã cắt sẵn của app) → id → `<symbol>` thành nội dung SVG 16×16. */
function loadSymbols(): Promise<Map<string, string>> {
  symbolSprite ??= readFile(path.join(process.cwd(), 'public/tool-icons/symbols.svg'), 'utf8').then((sprite) => {
    const symbols = new Map<string, string>()
    for (const match of sprite.matchAll(/<symbol id="([^"]+)" viewBox="0 0 16 16">([\s\S]*?)<\/symbol>/g)) symbols.set(match[1], match[2])
    return symbols
  })
  return symbolSprite
}

/** Ký hiệu ngoài sprite thì đọc từ bootstrap-icons (cùng cách `ToolArtwork` rơi về `<Icon>`). */
async function symbolBody(name: string): Promise<string> {
  const local = (await loadSymbols()).get(name)
  if (local) return local
  const file = await readFile(path.join(process.cwd(), 'node_modules/bootstrap-icons/icons', `${name}.svg`), 'utf8')
  return file.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

const symbolSvg = (body: string, x: number, y: number, size: number, color: string) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16" fill="${color}">${body.replaceAll('currentColor', color)}</svg>`

/** Hình minh hoạ React → SVG đặt vào ô (x, y, size); `var(--art-*)` thay bằng màu thật vì không có CSS. */
function illustrationSvg(markup: string, tone: ArtworkTone, x: number, y: number, size: number): string {
  const colors = TONES[tone]
  return markup
    .replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `)
    .replaceAll('var(--art-light)', colors.light).replaceAll('var(--art-main)', colors.main).replaceAll('var(--art-dark)', colors.dark)
}

/** SVG 512×512 của icon; `variant` quyết định bo góc và vùng an toàn. */
export async function toolAppIconSvg(tool: Pick<ToolDefinition, 'id' | 'icon' | 'categories'>, variant: ToolIconVariant): Promise<string> {
  const art = toolArtworkStyle(tool)
  const tone = TONES[art.tone]
  const { kind } = TOOL_ICON_VARIANTS[variant]
  // maskable: Android cắt theo hình tròn/vuông của launcher, chỉ vùng tròn 80% ở giữa là chắc còn.
  const box = kind === 'maskable' ? 250 : kind === 'apple' ? 300 : 320
  const x = (512 - box) / 2
  const radius = kind === 'any' ? 112 : 0

  let artwork: string
  if (art.glyph && ILLUSTRATED.has(art.glyph)) {
    artwork = illustrationSvg(svgMarkup(createElement(ToolIllustration, { glyph: art.glyph, label: art.label })), art.tone, x, x, box)
  } else if (art.glyph) {
    artwork = illustrationSvg(svgMarkup(createElement(ToolOutlineIllustration, { glyph: art.glyph, label: art.label })), art.tone, x, x, box)
  } else {
    const glyph = box * 0.82
    artwork = symbolSvg(await symbolBody(art.symbol ?? tool.icon), x + (box - glyph) / 2, x + (box - glyph) / 2, glyph, NAVY)
  }

  let badge = ''
  if (art.badge) {
    const size = box * 0.36, bx = x + box - size * 0.8, by = x + box - size * 0.8
    badge = `<rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="${size * 0.24}" fill="${BADGE}" stroke="#fff" stroke-width="${size * 0.09}"/>`
      + symbolSvg(await symbolBody(art.badge), bx + size * 0.22, by + size * 0.22, size * 0.56, '#fff')
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">`
    + `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${tone.tint}"/></linearGradient></defs>`
    + `<rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>${artwork}${badge}</svg>`
}

export async function toolAppIconPng(tool: Pick<ToolDefinition, 'id' | 'icon' | 'categories'>, variant: ToolIconVariant): Promise<Buffer> {
  const svg = await toolAppIconSvg(tool, variant)
  const { size } = TOOL_ICON_VARIANTS[variant]
  return sharp(Buffer.from(svg), { density: 72 * (size / 512) * 4 }).resize(size, size).png().toBuffer()
}
