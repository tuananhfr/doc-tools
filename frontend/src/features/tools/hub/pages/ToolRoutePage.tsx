import { useEffect } from 'react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { GuestPrefs } from '../components/GuestPrefs'
import { GuestSessionAction } from '../components/GuestSessionAction'
import { ToolUnsupported } from '../components/ToolUnsupported'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import { PDF_ENGINE_SCREENS } from '../config/tool-catalog'
import { useToolsBranch } from '../hooks/tools-branch'
import { useGuestSessionAction } from '../hooks/useGuestSessionAction'
import { useRecordToolVisit } from '../hooks/useRecordToolVisit'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToolCatalog } from '../hooks/useToolCatalog'
import type { ToolScreen } from '../types/tool.types'
import { pdfEngineSupported } from '../utils/browser-support'
import { trackRecentTool } from '../utils/hub-prefs'
import { resolveToolRoute, toolPageTitle, toolPath } from '../utils/tool-lookup'
import { useToolOrigin } from '../hooks/useToolOrigin'
import { workspaceTabsFor } from '../utils/workspace-tabs'
import { ToolCapability } from '../components/ToolCapability'

interface ToolRoutePageProps {
  /** Màn thật của từng loại công cụ — tầng route truyền vào, hub không import feature khác. */
  screens: Record<ToolScreen, ComponentType>
  workspaceVersions?: Readonly<Record<string, number>>
  /** Nút cạnh tiêu đề (yêu thích của Pro) — tầng route truyền vào, cùng lý do như `screens`. */
  headerAction?: ComponentType<{ toolSlug: string }>
  feedbackAction?: ComponentType<{ toolSlug: string; toolName: string }>
}

/**
 * MỘT CÔNG CỤ (`<gốc của nhánh>/<slug>`): dải đường dẫn về trang chọn + màn của công cụ.
 *
 * Mọi slug đi qua CÙNG component này và cùng vị trí của `Screen` trong cây, nên
 * chuyển giữa hai công cụ chung một màn (ghép ↔ tách) không dựng lại màn đó —
 * tệp đang làm còn nguyên.
 */
export default function ToolRoutePage({ screens, workspaceVersions, headerAction: HeaderAction, feedbackAction: FeedbackAction }: ToolRoutePageProps) {
  const { tool: slug } = useParams()
  const { base, kind } = useToolsBranch()
  const { backTo, backState } = useToolOrigin()
  const sessionAction = useGuestSessionAction()
  const { t } = useTranslation('common')
  const { t: tCatalog } = useTranslation('catalog')
  const catalog = useToolCatalog()
  const { tool, redirect } = resolveToolRoute(slug, catalog)

  const readySlug = tool?.slug ?? null

  usePageTitle(tool ? toolPageTitle(tool) : null)
  useEffect(() => {
    if (readySlug) trackRecentTool(readySlug)
  }, [readySlug])
  useRecordToolVisit(readySlug)

  if (!tool) return <Navigate to={base} replace />
  if (redirect) return <Navigate to={toolPath(base, { slug: redirect })} replace />

  const Screen = screens[tool.screen]
  /* Hỏi TRƯỚC khi vẽ `Screen`: vẽ ra là nạp chunk pdf.js, mà trên trình duyệt
     cũ chunk đó ném lỗi ngay lúc nạp (xem `utils/browser-support.ts`). */
  const unsupported = PDF_ENGINE_SCREENS.has(tool.screen) && !pdfEngineSupported()
  const workspace = workspaceTabsFor(tool.id, catalog, base)

  return (
    <div data-workspace-version={workspaceVersions?.[tool.id]} className={`erp-tool-page cn-tool-workspace${tool.screen === 'editor' ? ' cn-tool-workspace--editor' : ''}`}>
      <nav className="erp-tool-crumb" aria-label={t('crumb.label')}>
        <Link className="erp-tool-crumb__back" to={kind === 'public' ? backTo : base} state={backState}>
          <Icon name="arrow-left" />
          {t('crumb.backTools')}
        </Link>
        <Icon name="chevron-right" className="erp-tool-crumb__sep" />
        <span className="cn-tool-crumb-current">{tool.name}</span>
        {kind === 'public' ? <GuestPrefs className="erp-tool-crumb__prefs" /> : null}
        {sessionAction ? (
          <GuestSessionAction action={sessionAction} className="btn-outline-secondary erp-tool-crumb__action" />
        ) : null}
      </nav>

      <header className="cn-tool-intro">
        <span className="cn-tool-intro__icon"><Icon name={tool.icon} /></span>
        <div className="cn-tool-intro__text">
          <h1 className="erp-tool-crumb__title">{tool.name}</h1>
          <p className="cn-tool-description">{tool.description}</p>
          <p className="cn-tool-privacy">
            <Icon name="shield-check" />
            {tool.privacyNote ?? (tool.noFile ? t('tool.privacyNoFile') : t('tool.privacyFile'))}
          </p>
          <ToolCapability device={tool.device} />
        </div>
        {HeaderAction ? <HeaderAction toolSlug={tool.slug} /> : null}
      </header>

      {FeedbackAction ? <FeedbackAction key={tool.slug} toolSlug={tool.slug} toolName={tool.name} /> : null}

      {/* Ô này luôn có mặt (kể cả null) để `Screen` đứng cùng vị trí với mọi công cụ: đổi giữa hai slug
          chung một màn vẫn không dựng lại màn. */}
      {workspace ? <WorkspaceTabs label={tCatalog(`workspaceTabs.${workspace.groupId}`)} tabs={workspace.tabs} /> : null}

      {unsupported ? <ToolUnsupported toolName={tool.name} hubPath={base} /> : <Screen />}
    </div>
  )
}
