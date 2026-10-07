import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { RequirePermission } from './components/RequirePermission'
import { ADMIN_ROOT } from './config/admin-nav'
import type { Permission } from './types/admin.types'
import AdminOverviewPage from './pages/AdminOverviewPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminContributionsPage from './pages/AdminContributionsPage'
import AdminToolsPage from './pages/AdminToolsPage'
import AdminMailPage from './pages/AdminMailPage'
import AdminAiPage from './pages/AdminAiPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminRolesPage from './pages/AdminRolesPage'
import AdminAuditPage from './pages/AdminAuditPage'

const guard = (permission: Permission, page: ReactElement) => <RequirePermission permission={permission}>{page}</RequirePermission>

/** Mounted under `/quan-tri/*`; the whole area is one lazy chunk so visitors never download it. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={guard('dashboard.view', <AdminOverviewPage />)} />
        <Route path="nguoi-dung" element={guard('users.view', <AdminUsersPage />)} />
        <Route path="de-xuat" element={guard('contributions.review', <AdminContributionsPage />)} />
        <Route path="cong-cu" element={guard('tools.view', <AdminToolsPage />)} />
        <Route path="email" element={guard('mail.view', <AdminMailPage />)} />
        <Route path="tai-khoan-ai" element={guard('ai.view', <AdminAiPage />)} />
        <Route path="cai-dat" element={guard('settings.manage', <AdminSettingsPage />)} />
        <Route path="phan-quyen" element={guard('roles.manage', <AdminRolesPage />)} />
        <Route path="nhat-ky" element={guard('audit.view', <AdminAuditPage />)} />
        <Route path="*" element={<Navigate to={ADMIN_ROOT} replace />} />
      </Route>
    </Routes>
  )
}
