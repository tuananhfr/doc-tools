'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ROUTER_BASENAME, withBase } from '@/utils/url'
import { ROUTES } from '@/constants/routes'
import { localePrefix, localizePath, splitLocalePath, type Locale } from '@/i18n/locales'
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ToolsLayout } from '@/layouts/ToolsLayout'
import ToolsHubPage from '@/features/tools/hub/pages/ToolsHubPage'
import ToolDirectoryPage from '@/features/site/pages/ToolDirectoryPage'
import CategoryHubPage from '@/features/site/pages/CategoryHubPage'
import AboutPage from '@/features/site/pages/AboutPage'
import SupportPage from '@/features/site/pages/SupportPage'
import DataProcessingPage from '@/features/site/pages/DataProcessingPage'
import InstallPage from '@/features/site/pages/InstallPage'
import GuidesPage from '@/features/site/pages/GuidesPage'
import GuidePage from '@/features/site/pages/GuidePage'
import LegalPage from '@/features/site/pages/LegalPage'
import { TOOL_SCREENS } from './tool-screens'
import { ToolRouteFallback } from './ToolRouteFallback'

const ToolRoutePage = dynamic(() => import('@/features/tools/hub/pages/ToolRoutePage'), { ssr: false, loading: ToolRouteFallback })
const routes: RouteObject[] = [{ path: ROUTES.docTools, element: <ToolsLayout />, children: [
  { index: true, element: <ToolsHubPage /> },
  { path: 'cong-cu', element: <ToolDirectoryPage /> },
  // Trang site khai trước `:tool`; slug giữ ở features/site/config/site-pages.ts.
  { path: 'xay-dung', element: <CategoryHubPage key="xay-dung" slug="xay-dung" /> },
  { path: 'gia-dinh', element: <CategoryHubPage key="gia-dinh" slug="gia-dinh" /> },
  { path: 'tai-lieu-pdf', element: <CategoryHubPage key="tai-lieu-pdf" slug="tai-lieu-pdf" /> },
  { path: 've-chung-toi', element: <AboutPage /> },
  { path: 'ho-tro', element: <SupportPage /> },
  { path: 'xu-ly-du-lieu', element: <DataProcessingPage /> },
  { path: 'cai-dat', element: <InstallPage /> },
  { path: 'huong-dan', element: <GuidesPage /> },
  { path: 'huong-dan/:guide', element: <GuidePage /> },
  { path: 'dieu-khoan', element: <LegalPage key="dieu-khoan" slug="dieu-khoan" /> },
  { path: 'quyen-rieng-tu', element: <LegalPage key="quyen-rieng-tu" slug="quyen-rieng-tu" /> },
  { path: ':tool', element: <ToolRoutePage screens={TOOL_SCREENS} /> },
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
