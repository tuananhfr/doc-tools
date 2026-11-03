import { useEffect } from 'react'
import type { Locale } from '@/i18n/locales'
import { withBase } from '@/utils/url'
import { SITE_APPLE_ICON } from '../config/brand-assets'
import { siteManifestPath, toolIconPath, toolManifestPath } from '../config/tool-app'
import { resetInstallPrompt } from './useInstallPrompt'

const SITE_APP_TITLE = 'Chuyện Nhỏ'

/** Ba thẻ trình duyệt đọc lúc "Cài đặt" / "Thêm vào MH chính"; Next vẽ sẵn từ metadata. */
function headTags(): [Element | null, string][] {
  return [
    [document.head.querySelector('link[rel="manifest"]'), 'href'],
    [document.head.querySelector('link[rel="apple-touch-icon"]'), 'href'],
    [document.head.querySelector('meta[name="apple-mobile-web-app-title"]'), 'content'],
  ]
}

function applyHead(values: readonly string[]) {
  const tags = headTags()
  const manifestBefore = tags[0][0]?.getAttribute('href')
  tags.forEach(([tag, attribute], index) => {
    if (tag && tag.getAttribute(attribute) !== values[index]) tag.setAttribute(attribute, values[index])
  })
  if (manifestBefore !== tags[0][0]?.getAttribute('href')) resetInstallPrompt()
}

/**
 * Trang công cụ: cài từ đây ra icon RIÊNG của công cụ, bấm là vào thẳng công cụ đó.
 *
 * Metadata của `app/[lang]/[tool]/page.tsx` chỉ có hiệu lực khi tải thẳng trang công cụ; đi từ
 * trang chủ sang bằng React Router thì `<head>` vẫn là của app chung, nên đổi tay ở đây và
 * trả về app chung khi rời công cụ (kể cả khi trang đầu tiên tải là trang công cụ).
 */
export function useToolAppManifest(tool: { slug: string; name: string } | null, locale: Locale) {
  const slug = tool?.slug ?? null
  const name = tool?.name ?? null
  useEffect(() => {
    if (!slug || !name) return
    applyHead([toolManifestPath(slug, locale), toolIconPath(slug, 'apple-180'), name])
    return () => applyHead([siteManifestPath(locale), withBase(SITE_APPLE_ICON), SITE_APP_TITLE])
  }, [slug, name, locale])
}
