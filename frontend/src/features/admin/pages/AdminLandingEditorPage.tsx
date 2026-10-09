import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { AdminPage, LoadError, SkeletonRows } from '../components/AdminKit'
import { LandingEditor } from '../components/landing/LandingEditor'
import { adminPath } from '../config/admin-nav'
import { useLanding } from '../hooks/useLandings'
import { landingPublicUrl } from '../utils/landing-url'

export default function AdminLandingEditorPage({ landingKey }: { landingKey: string }) {
  const landing = useLanding(landingKey)
  const back = <Link className="cn-admin-button is-ghost" to={adminPath('trang-gioi-thieu')}><Icon name="arrow-left" />Danh sách trang</Link>
  return (
    <AdminPage
      title={landing.data?.name ?? 'Trang giới thiệu'}
      description={<>Địa chỉ để website gắn trang chuyển tiếp tới: <code className="cn-admin-break">{landingPublicUrl(landingKey)}</code></>}
      actions={back}
    >
      {landing.isPending ? <SkeletonRows rows={8} /> : landing.isError ? <LoadError error={landing.error} onRetry={() => void landing.refetch()} /> : (
        <LandingEditor key={landing.data.key} detail={landing.data} onReload={() => landing.refetch().then((result) => result.data)} />
      )}
    </AdminPage>
  )
}
