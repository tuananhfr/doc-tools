import { useParams } from 'react-router-dom'
import { ToolInstallHint } from '@/features/site/components/ToolInstallHint'
import { useToolAppManifest } from '@/features/site/hooks/useToolAppManifest'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
import { useLocale } from '@/i18n/I18nProvider'

/**
 * Nối site ↔ hub cho trang công cụ (hub không import site): `<head>` trỏ manifest + icon của công cụ
 * đang mở, và thẻ gợi ý thêm công cụ đó ra màn hình chính. Đặt ngoài `ToolRoutePage` vì nhiều
 * công cụ (studio) không vẽ phần đầu trang chung.
 */
export function ToolAppShortcut() {
  const { tool: slug } = useParams()
  const locale = useLocale()
  const { tool, redirect } = resolveToolRoute(slug, useToolCatalog())
  const ready = tool && !redirect ? tool : null
  useToolAppManifest(ready, locale)
  return ready ? <ToolInstallHint key={ready.slug} slug={ready.slug} name={ready.name} /> : null
}
