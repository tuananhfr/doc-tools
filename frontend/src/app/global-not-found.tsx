import type { Metadata } from 'next'
import { withBase } from '@/utils/url'

// The root layout lives under the dynamic `[lang]` segment, so an unmatched URL has no layout to render into.
export const metadata: Metadata = { title: 'Không tìm thấy trang · Page not found — Chuyện Nhỏ', robots: { index: false, follow: true } }

export default function GlobalNotFound() {
  return <html lang="vi">
    <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#f5f8fc', color: '#0b1f3a' }}>
      <main style={{ textAlign: 'center', padding: 24 }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>404</h1>
        <p style={{ margin: '0 0 4px' }}>Không tìm thấy trang này.</p>
        <p lang="en" style={{ margin: '0 0 20px', opacity: 0.75 }}>This page could not be found.</p>
        <a href={withBase('/')} style={{ color: '#005be8', fontWeight: 600 }}>Chuyện Nhỏ</a>
      </main>
    </body>
  </html>
}
