import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import type { ReadyTool } from '@/features/tools/hub/types/tool.types'

const palette = { ink: '#0c254d', muted: '#536174', accent: '#005be8', background: '#f3f9ff', tint: '#eaf4ff' }
const fontAssets = Promise.all([
  readFile(path.join(process.cwd(), 'src/assets/fonts/BeVietnamPro-Regular.ttf')),
  readFile(path.join(process.cwd(), 'src/assets/fonts/BeVietnamPro-Bold.ttf')),
  readFile(path.join(process.cwd(), 'src/assets/fonts/Arimo-Regular.ttf')),
]).then(([regular, bold, symbols]) => [
  { name: 'Be Vietnam Pro', data: new Uint8Array(regular).buffer, weight: 400 as const, style: 'normal' as const },
  { name: 'Be Vietnam Pro', data: new Uint8Array(bold).buffer, weight: 700 as const, style: 'normal' as const },
  { name: 'Arimo', data: new Uint8Array(symbols).buffer, weight: 400 as const, style: 'normal' as const },
])

async function loadToolIcon(icon: string): Promise<string> {
  const svg = await readFile(path.join(process.cwd(), 'node_modules/bootstrap-icons/icons', `${icon}.svg`), 'utf8')
  return 'data:image/svg+xml;base64,' + Buffer.from(svg.replaceAll('currentColor', palette.accent)).toString('base64')
}

export async function createToolShareImage(tool: ReadyTool): Promise<ImageResponse> {
  const [fonts, icon] = await Promise.all([fontAssets, loadToolIcon(tool.icon)])
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: palette.background, color: palette.ink, fontFamily: 'Be Vietnam Pro, Arimo' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 64px 0' }}>
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: '-1px' }}>
          <span>Chuyện</span><span style={{ color: palette.accent, marginLeft: 8 }}>Nhỏ</span>
        </div>
        <span style={{ fontSize: 24, color: palette.muted }}>Công cụ miễn phí</span>
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
        <span style={{ fontWeight: 700, color: palette.accent }}>Cần là dùng.</span>
        <span style={{ color: palette.muted }}>Không cần tài khoản</span>
      </div>
    </div>,
    { width: 1200, height: 630, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
