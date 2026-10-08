import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { loginPath, useLogout } from '@/features/account'
import { ADMIN_ROOT, ADMIN_SECTIONS, adminPath } from '../config/admin-nav'
import { ROLE_LABEL } from '../config/admin-labels'
import { useForgetAdmin, useWhoami } from '../hooks/useAdmin'
import { AdminError } from '../services/admin.service'
import type { Staff } from '../types/admin.types'
import { AdminGateCard } from './AdminGateCard'

function Sidebar({ staff, onNavigate }: { staff: Staff; onNavigate?: () => void }) {
  const logout = useLogout()
  const forget = useForgetAdmin()
  const navigate = useNavigate()
  const { mode, setTheme } = useThemeMode()
  const signOut = () => logout.mutate(undefined, { onSettled: () => { forget(); navigate('/', { replace: true }) } })
  return (
    <div className="cn-admin-sidebar__inner">
      <Link className="cn-admin-brand" to={ADMIN_ROOT} onClick={onNavigate}>
        <span className="cn-admin-brand__mark" aria-hidden="true">CN</span>
        <span>Chuyện Nhỏ<small>Quản trị</small></span>
      </Link>
      <nav className="cn-admin-nav" aria-label="Khu quản trị">
        {ADMIN_SECTIONS.filter((section) => staff.permissions.includes(section.permission)).map((section) => (
          <NavLink key={section.slug} to={adminPath(section.slug)} end={section.slug === ''} onClick={onNavigate}>
            <Icon name={section.icon} />{section.label}
          </NavLink>
        ))}
      </nav>
      <div className="cn-admin-sidebar__foot">
        <div className="cn-admin-whoami">
          <span className="cn-admin-whoami__email" title={staff.email}>{staff.email}</span>
          <span className="cn-admin-whoami__role">{ROLE_LABEL[staff.role]}</span>
        </div>
        <div className="cn-admin-sidebar__actions">
          <button type="button" className="cn-admin-icon" onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')} aria-label={mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title="Đổi giao diện sáng/tối">
            <Icon name={mode === 'dark' ? 'sun' : 'moon-stars'} />
          </button>
          <Link className="cn-admin-icon" to="/" aria-label="Về trang Chuyện Nhỏ" title="Về trang Chuyện Nhỏ" onClick={onNavigate}><Icon name="house" /></Link>
          <button type="button" className="cn-admin-icon" onClick={signOut} disabled={logout.isPending} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="box-arrow-right" /></button>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const whoami = useWhoami()
  const logout = useLogout()
  const forget = useForgetAdmin()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  if (whoami.isPending) return <div className="cn-site cn-admin is-gate"><div className="cn-admin-gate-loading" aria-busy="true" aria-label="Đang kiểm tra quyền quản trị" /></div>
  if (whoami.isError) {
    const code = whoami.error instanceof AdminError ? whoami.error.code : 'UNKNOWN'
    // Ordinary accounts are sent home, as if the area did not exist for them.
    if (code === 'NOT_STAFF') return <Navigate to="/" replace />
    const next = location.pathname + location.search
    if (code === 'SIGNED_OUT') return <AdminGateCard icon="shield-lock" title="Đăng nhập để vào khu quản trị" text="Dùng email và mật khẩu của tài khoản đã được cấp quyền quản trị." action={<Link className="cn-admin-button" to={loginPath(next)}>Đăng nhập</Link>} />
    if (code === 'STAFF_REAUTH') {
      return <AdminGateCard icon="clock-history" title="Phiên quản trị đã quá 12 giờ" text="Vì an toàn, khu quản trị cần một lần đăng nhập mới mỗi 12 giờ." action={<button type="button" className="cn-admin-button" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSettled: () => { forget(); navigate(loginPath(next)) } })}>Đăng nhập lại</button>} />
    }
    return <AdminGateCard icon="wifi-off" title="Chưa vào được khu quản trị" text={whoami.error instanceof AdminError ? whoami.error.message : 'Có lỗi xảy ra.'} action={<button type="button" className="cn-admin-button" onClick={() => void whoami.refetch()}>Thử lại</button>} />
  }

  const staff = whoami.data
  return (
    <div className={`cn-site cn-admin${menuOpen ? ' is-menu-open' : ''}`}>
      <a className="cn-skip-link" href="#cn-admin-main">Bỏ qua điều hướng</a>
      <aside className="cn-admin-sidebar" id="cn-admin-sidebar"><Sidebar staff={staff} onNavigate={() => setMenuOpen(false)} /></aside>
      <button type="button" className="cn-admin-scrim" aria-label="Đóng menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />
      <div className="cn-admin-body">
        <header className="cn-admin-topbar">
          <button type="button" className="cn-admin-icon" aria-label="Mở menu quản trị" aria-expanded={menuOpen} aria-controls="cn-admin-sidebar" onClick={() => setMenuOpen(true)}><Icon name="list" /></button>
          <span className="cn-admin-topbar__title">Quản trị Chuyện Nhỏ</span>
        </header>
        <main id="cn-admin-main" className="cn-admin-main" tabIndex={-1}><Outlet context={staff} /></main>
      </div>
    </div>
  )
}
