import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 86400

export async function GET() {
  const [regular, bold, logo] = await Promise.all([
    readFile(path.join(process.cwd(), 'src/assets/fonts/BeVietnamPro-Regular.ttf')),
    readFile(path.join(process.cwd(), 'src/assets/fonts/BeVietnamPro-Bold.ttf')),
    readFile(path.join(process.cwd(), 'public/brand/chuyen-nho-mark-v1.png')),
  ])
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '64px 76px', background: '#f3f9ff', color: '#0c254d', fontFamily: 'Be Vietnam Pro' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <img src={'data:image/png;base64,' + logo.toString('base64')} width={96} height={96} alt="" />
        <div style={{ display: 'flex', fontSize: 66, fontWeight: 700 }}>Chuyện <span style={{ color: '#005be8', marginLeft: 16 }}>Nhỏ</span></div>
      </div>
      <div style={{ display: 'flex', fontSize: 54, lineHeight: 1.3, fontWeight: 700, marginTop: 52 }}>Công cụ cho việc cần mỗi ngày.</div>
      <div style={{ display: 'flex', fontSize: 30, color: '#536174', marginTop: 24 }}>Tài liệu, hình ảnh và tiện ích đời sống.</div>
      <div style={{ display: 'flex', fontSize: 28, color: '#005be8', marginTop: 'auto' }}>chuyennho.tekshot.ai</div>
    </div>,
    { width: 1200, height: 630, fonts: [
      { name: 'Be Vietnam Pro', data: new Uint8Array(regular).buffer, weight: 400, style: 'normal' },
      { name: 'Be Vietnam Pro', data: new Uint8Array(bold).buffer, weight: 700, style: 'normal' },
    ], headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
