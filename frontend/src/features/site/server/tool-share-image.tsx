import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import type { ReadyTool } from '@/features/tools/hub/types/tool.types'
import type { Locale } from '@/i18n/locales'
import { getServerT } from '@/i18n/server'

type ShareFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }

const palette = { ink: '#0c254d', muted: '#536174', accent: '#005be8', background: '#f3f9ff', tint: '#eaf4ff' }
const CJK_FONT: Partial<Record<Locale, string>> = { ja: 'NotoSansJP', ko: 'NotoSansKR', 'zh-hans': 'NotoSansSC', 'zh-hant': 'NotoSansTC' }
const fontCache = new Map<Locale, Promise<ShareFont[]>>()

const readFont = async (file: string) => new Uint8Array(await readFile(path.join(process.cwd(), 'src/assets/fonts', file))).buffer
const shareFont = async (name: string, file: string, weight: 400 | 700): Promise<ShareFont> => ({ name, data: await readFont(file), weight, style: 'normal' })

function loadFonts(locale: Locale): Promise<ShareFont[]> {
  const cached = fontCache.get(locale)
  if (cached) return cached
  const cjk = CJK_FONT[locale]
  const fonts = Promise.all([
    shareFont('Be Vietnam Pro', 'BeVietnamPro-Regular.ttf', 400),
    shareFont('Be Vietnam Pro', 'BeVietnamPro-Bold.ttf', 700),
    shareFont('Arimo', 'Arimo-Regular.ttf', 400),
    // Pre-subset to the catalog's characters (scripts/subset-cjk-fonts.py), so tool names always have glyphs.
    ...(cjk ? [shareFont('Noto Sans CJK', `${cjk}-Regular.ttf`, 400), shareFont('Noto Sans CJK', `${cjk}-Bold.ttf`, 700)] : []),
  ])
  fontCache.set(locale, fonts)
  return fonts
}

async function loadToolIcon(icon: string): Promise<string> {
  const svg = await readFile(path.join(process.cwd(), 'node_modules/bootstrap-icons/icons', `${icon}.svg`), 'utf8')
  return 'data:image/svg+xml;base64,' + Buffer.from(svg.replaceAll('currentColor', palette.accent)).toString('base64')
}

/** `tool` must already be localized to `locale`, which is the card's language (see `shareImageLocale`). */
export async function createToolShareImage(tool: ReadyTool, locale: Locale): Promise<ImageResponse> {
  const [fonts, icon, t] = await Promise.all([loadFonts(locale), loadToolIcon(tool.icon), getServerT(locale, 'site')])
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: palette.background, color: palette.ink, fontFamily: 'Be Vietnam Pro, Noto Sans CJK, Arimo' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 64px 0' }}>
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: '-1px' }}>
          <span>Chuyện</span><span style={{ color: palette.accent, marginLeft: 8 }}>Nhỏ</span>
        </div>
        <span style={{ fontSize: 24, color: palette.muted }}>{t('shareImage.label')}</span>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '30px 64px 42px' }}>
        <div style={{ display: 'flex', width: 300, height: 300, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 28, background: palette.tint }}>
          <img src={icon} width={224} height={224} alt="" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 48, width: 660 }}>
          <div style={{ display: 'flex', fontSize: tool.name.length > 27 ? 56 : 64, fontWeight: 700, lineHeight: 1.16, letterSpacing: '-1.5px' }}>{tool.name}</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 30, lineHeight: 1.4, color: palette.muted }}>{tool.description}</div>
        </div>
      </div>
      <div style={{ display: 'flex', height: 88, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', padding: '0 64px', background: 'white', fontSize: 24 }}>
        <span style={{ fontWeight: 700, color: palette.accent }}>{t('shareImage.slogan')}</span>
        <span style={{ color: palette.muted }}>{t('shareImage.noAccount')}</span>
      </div>
    </div>,
    { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
