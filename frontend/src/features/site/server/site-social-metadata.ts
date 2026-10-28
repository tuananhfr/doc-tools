import type { Metadata } from 'next'
import { withBase } from '@/utils/url'

/** Nested Open Graph fields replace layout defaults in Next; keep the image on every public site page. */
export function siteSocialMetadata(title: string, description: string, url: string, type: 'website' | 'article' = 'website'): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = { url: withBase('/og/site'), width: 1200, height: 630, type: 'image/png', alt: 'Chuyện Nhỏ — Công cụ cho việc cần mỗi ngày' }
  return {
    openGraph: { title, description, url, type, siteName: 'Chuyện Nhỏ', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
