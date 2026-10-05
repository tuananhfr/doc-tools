import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Icon, Loading } from '@/components/ui'
import { GuestPrefs } from '@/features/tools/hub/components/GuestPrefs'
import { GuestSessionAction } from '@/features/tools/hub/components/GuestSessionAction'
import { useGuestSessionAction } from '@/features/tools/hub/hooks/useGuestSessionAction'
import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
export function ToolRouteFallback() {
  const { tool: slug } = useParams()
  const { tool } = resolveToolRoute(slug)
  const action = useGuestSessionAction()
  return <div className="erp-tool-page"><nav className="erp-tool-crumb" aria-label="Vị trí">
    <Link className="erp-tool-crumb__back" to={ROUTES.docTools}><Icon name="arrow-left" />Chuyện Nhỏ</Link>
    <Icon name="chevron-right" className="erp-tool-crumb__sep" />
    <h1 className="erp-tool-crumb__title">{tool?.name}</h1>
    <GuestPrefs className="erp-tool-crumb__prefs" />
    {action ? <GuestSessionAction action={action} className="btn-outline-secondary erp-tool-crumb__action" /> : null}
  </nav><Loading /></div>
}
