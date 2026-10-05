import { withBase } from '@/utils/url'
import type { Metadata } from 'next'
import { DIRECTORY_TITLE } from '@/features/site/config/home-content'

export const metadata: Metadata = {
  title: DIRECTORY_TITLE,
  description: 'Tất cả công cụ PDF, hình ảnh, mã QR và tiện ích miễn phí của Chuyện Nhỏ. Không cần tài khoản, xử lý ngay trên thiết bị.',
  alternates: { canonical: withBase('/cong-cu') },
  openGraph: { title: DIRECTORY_TITLE, url: withBase('/cong-cu') },
}

export default function DirectoryRoute() { return null }
