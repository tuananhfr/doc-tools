'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ROUTER_BASENAME, withBase } from '@/utils/url'
import { ROUTES } from '@/constants/routes'
import { localePrefix, localizePath, splitLocalePath, type Locale } from '@/i18n/locales'
import { createBrowserRouter, createMemoryRouter, RouterProvider, Navigate, useLocation, type RouteObject } from 'react-router-dom'
import { ToolsLayout } from '@/layouts/ToolsLayout'
import { LandingLayout } from '@/features/site/landing/LandingLayout'
import { LandingPage } from '@/features/site/landing/LandingPage'
import ToolDirectoryPage from '@/features/site/pages/ToolDirectoryPage'
import CategoryHubPage from '@/features/site/pages/CategoryHubPage'
import AboutPage from '@/features/site/pages/AboutPage'
import SupportPage from '@/features/site/pages/SupportPage'
import DataProcessingPage from '@/features/site/pages/DataProcessingPage'
import InstallPage from '@/features/site/pages/InstallPage'
import GuidesPage from '@/features/site/pages/GuidesPage'
import GuidePage from '@/features/site/pages/GuidePage'
import LegalPage from '@/features/site/pages/LegalPage'
import { AccountPage, LoginPage, MyContributionsPage } from '@/features/account'
import CommunityPage from '@/features/community/pages/CommunityPage'
import { ToolFeedback } from '@/features/community/components/ToolFeedback'
import EcosystemPage from '@/features/site/pages/EcosystemPage'
import {WORKSPACE_REGISTRY} from './workspace-registry'
import { TOOL_SCREENS } from './tool-screens'
import { ToolRouteFallback } from './ToolRouteFallback'
import { ToolFavourite } from './ToolFavourite'
import { ADMIN_ROOT } from '@/features/admin'

const FamilyCalendarProductPage = dynamic(() => import('@/features/site/pages/FamilyCalendarProductPage'), { ssr: false, loading: ToolRouteFallback })
const ToolRoutePage = dynamic(() => import('@/features/tools/hub/pages/ToolRoutePage'), { ssr: false, loading: ToolRouteFallback })
// Client-only: the page is about the signed-in member's AI key, nothing to prerender.
const AiSettingsPage = dynamic(() => import('@/features/ai/pages/AiSettingsPage'), { ssr: false, loading: ToolRouteFallback })
const SavedPage = dynamic(() => import('@/features/cloud/pages/SavedPage'), { ssr: false, loading: ToolRouteFallback })
// Own chrome outside ToolsLayout, and client-only: every admin screen depends on the staff session.
const AdminApp = dynamic(() => import('@/features/admin/AdminApp'), { ssr: false, loading: () => <div className="cn-site cn-admin is-gate"><div className="cn-admin-gate-loading" aria-busy="true" /></div> })
function LegacyDirectoryRedirect() {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: '/', search, hash }} replace />
}

const routes: RouteObject[] = [{ path: '/gioi-thieu', element: <LandingLayout />, children: [{ index: true, element: <LandingPage /> }] }, { path: ADMIN_ROOT + '/*', element: <AdminApp /> }, { path: ROUTES.docTools, element: <ToolsLayout />, children: [
  { index: true, element: <ToolDirectoryPage /> },
  { path: 'cong-cu', element: <LegacyDirectoryRedirect /> },
  { path: 'de-xuat-tien-ich', element: <CommunityPage key="idea" mode="idea" /> },
  { path: 'gop-y-quy-dinh', element: <CommunityPage key="feedback" mode="feedback" /> },
  { path: 'lich-gia-dinh', element: <FamilyCalendarProductPage /> },
  { path: 'he-sinh-thai', element: <EcosystemPage /> },
  // Trang site khai trước `:tool`; slug giữ ở features/site/config/site-pages.ts.
  { path: 'xay-dung', element: <Navigate to="/" replace /> },
  { path: 'gia-dinh', element: <Navigate to="/?nhom=gia-dinh" replace /> },
  { path: 'kham-pha-giai-tri', element: <Navigate to="/?nhom=kham-pha-giai-tri" replace /> },
  { path: 'tai-lieu-pdf', element: <CategoryHubPage key="tai-lieu-pdf" slug="tai-lieu-pdf" /> },
  { path: 'hinh-anh', element: <CategoryHubPage key="hinh-anh" slug="hinh-anh" /> },
  { path: 'ma-qr', element: <CategoryHubPage key="ma-qr" slug="ma-qr" /> },
  { path: 'doc-va-nghe', element: <Navigate to="/?nhom=gia-dinh" replace /> },
  { path: 'tinh-toan', element: <CategoryHubPage key="tinh-toan" slug="tinh-toan" /> },
  { path: 'mau-giay-to', element: <CategoryHubPage key="mau-giay-to" slug="mau-giay-to" /> },
  { path: 've-chung-toi', element: <AboutPage /> },
  { path: 'ho-tro', element: <SupportPage /> },
  { path: 'xu-ly-du-lieu', element: <DataProcessingPage /> },
  { path: 'cai-dat', element: <InstallPage /> },
  { path: 'huong-dan', element: <GuidesPage /> },
  { path: 'huong-dan/:guide', element: <GuidePage /> },
  { path: 'dieu-khoan', element: <LegalPage key="dieu-khoan" slug="dieu-khoan" /> },
  { path: 'quyen-rieng-tu', element: <LegalPage key="quyen-rieng-tu" slug="quyen-rieng-tu" /> },
  { path: 'dang-nhap', element: <LoginPage /> },
  { path: 'tai-khoan', element: <AccountPage /> },
  { path: 'tai-khoan/ai', element: <AiSettingsPage /> },
  { path: 'tai-khoan/da-luu', element: <SavedPage /> },
  { path: 'de-xuat-cua-toi', element: <MyContributionsPage /> },
  { path: ':tool', element: <ToolRoutePage screens={TOOL_SCREENS} workspaceVersions={Object.fromEntries(Object.entries(WORKSPACE_REGISTRY).map(([id,entry])=>[id,entry.version]))} headerAction={ToolFavourite} feedbackAction={ToolFeedback} /> },
] }]

export function ToolsRouter({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  // Retain the data router so file handoff, screen identity and leave guards keep their behavior.
  const [router] = useState(() => {
    // The locale lives in the basename, so every locale-free `ROUTES` link and `<Link to>` keeps its language.
    const prefix = localePrefix(locale)
    const basename = prefix ? withBase(prefix) : ROUTER_BASENAME
    if (typeof window !== 'undefined') return createBrowserRouter(routes, { basename })
    // On the server the pathname is the prerendered one (`/vi/...` for the unprefixed default locale).
    const { rest } = splitLocalePath(pathname ?? ROUTES.docTools)
    return createMemoryRouter(routes, { basename, initialEntries: [withBase(localizePath(rest, locale))] })
  })
  return <RouterProvider router={router} />
}
