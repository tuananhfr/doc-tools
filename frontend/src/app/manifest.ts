import type { MetadataRoute } from 'next'
import { withBase } from '@/utils/url'

/** Không có manifest thì trình duyệt không cho "Cài đặt"/"Thêm vào màn hình chính" như một ứng dụng. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBase('/'),
    name: 'Chuyện Nhỏ: công cụ miễn phí',
    short_name: 'Chuyện Nhỏ',
    description: 'Công cụ PDF, hình ảnh, mã QR và tiện ích miễn phí. Xử lý ngay trên thiết bị.',
    lang: 'vi',
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#005be8',
    icons: [
      { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
