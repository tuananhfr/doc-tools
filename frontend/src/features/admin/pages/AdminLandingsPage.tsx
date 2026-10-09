import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { AdminPage, Empty, ErrorText, LoadError, Panel, Pill, SkeletonRows } from '../components/AdminKit'
import { adminPath } from '../config/admin-nav'
import { LANDING_DELAY_NOTE, LANDING_KEY_PATTERN, LANDING_LIMITS } from '../config/landing-form'
import { useCreateLanding, useLandings } from '../hooks/useLandings'
import type { LandingSummary } from '../types/admin.types'
import { formatDateTime } from '../utils/admin-format'
import { landingPublicUrl } from '../utils/landing-url'
import AdminLandingEditorPage from './AdminLandingEditorPage'

// A query, not a path segment: admin URLs are prebuilt one per section, so `/trang-gioi-thieu/<key>` would 404 on reload.
const editorPath = (key: string) => adminPath('trang-gioi-thieu', `?trang=${encodeURIComponent(key)}`)

function LandingState({ landing }: { landing: LandingSummary }) {
  if (!landing.published) return <Pill tone="neutral" icon="file-earmark">Chưa xuất bản</Pill>
  if (landing.unpublishedChanges) return <Pill tone="warning" icon="pencil-square">Có thay đổi chưa xuất bản</Pill>
  return <Pill tone="positive" icon="check2-circle">Đang xuất bản</Pill>
}

function CreateLanding() {
  const navigate = useNavigate()
  const create = useCreateLanding()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate({ key, name: name.trim() }, { onSuccess: (landing) => navigate(editorPath(landing.key)) })
  }
  return (
    <Panel title="Tạo trang mới">
      <form className="cn-admin-form" onSubmit={submit}>
        <label>Tên trang (nội bộ)<input required maxLength={LANDING_LIMITS.title} value={name} placeholder="Website xây dựng" onChange={(event) => setName(event.target.value)} /></label>
        <label>
          Mã trang
          <input required maxLength={40} pattern={LANDING_KEY_PATTERN} spellCheck={false} autoComplete="off" value={key} placeholder="xay-dung" onChange={(event) => setKey(event.target.value.toLowerCase())} />
          <span className="cn-admin-sub">Chữ thường không dấu, số và dấu gạch ngang. Mã nằm trong đường dẫn và không đổi được sau khi tạo.</span>
        </label>
        <div className="cn-admin-form__actions"><button type="submit" className="cn-admin-button" disabled={create.isPending}><Icon name="plus-lg" />Tạo trang</button></div>
        <ErrorText error={create.error} />
        <p className="cn-admin-sub">Trang mới có sẵn chữ của trang giới thiệu văn phòng; sửa lại cho hợp website rồi xuất bản.</p>
      </form>
    </Panel>
  )
}

export default function AdminLandingsPage() {
  const [params] = useSearchParams()
  const key = params.get('trang')
  return key ? <AdminLandingEditorPage landingKey={key} /> : <LandingList />
}

function LandingList() {
  const landings = useLandings()
  return (
    <AdminPage title="Trang giới thiệu" description="Mỗi website gắn một trang giới thiệu Chuyện Nhỏ riêng. Khối trên trang cố định; ở đây chỉ đổi chữ, ảnh, màu nhấn, logo và nền sáng/tối.">
      <div className="cn-admin-grid is-wide-left">
        <Panel title="Các trang" flush>
          {landings.isPending ? <SkeletonRows /> : landings.isError ? <LoadError error={landings.error} onRetry={() => void landings.refetch()} /> : landings.data.length === 0 ? (
            <Empty icon="window-stack" title="Chưa có trang nào" text="Tạo trang đầu tiên ở khung bên cạnh." />
          ) : (
            <div className="cn-admin-table-wrap">
              <table className="cn-admin-table">
                <thead><tr><th>Trang</th><th>Trạng thái</th><th>Sửa lần cuối</th><th aria-label="Thao tác" /></tr></thead>
                <tbody>{landings.data.map((landing) => (
                  <tr key={landing.key}>
                    <td><Link className="cn-admin-rowlink" to={editorPath(landing.key)}>{landing.name}</Link><span className="cn-admin-sub">{landing.key}</span></td>
                    <td><LandingState landing={landing} /></td>
                    <td>{formatDateTime(landing.updatedAt)}<span className="cn-admin-sub">{landing.updatedBy}</span></td>
                    <td className="is-actions">
                      {landing.published ? <a className="cn-admin-link" href={landingPublicUrl(landing.key)} target="_blank" rel="noreferrer">Mở trang thật<Icon name="box-arrow-up-right" /></a> : null}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="cn-admin-stack">
          <CreateLanding />
          <Panel title="Gắn vào website">
            <p className="cn-admin-lead">Website gắn trang chuyển tiếp (reverse proxy) một đường dẫn của nó, ví dụ <code>/chuyen-nho</code>, tới địa chỉ của trang:</p>
            <p className="cn-admin-break"><code>{landingPublicUrl('<mã trang>')}</code></p>
            <p className="cn-admin-sub">{LANDING_DELAY_NOTE}</p>
          </Panel>
        </div>
      </div>
    </AdminPage>
  )
}
