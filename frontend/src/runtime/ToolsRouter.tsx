'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/constants/routes'
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ToolsLayout } from '@/layouts/ToolsLayout'
import ToolsHubPage from '@/features/tools/hub/pages/ToolsHubPage'
import ToolDirectoryPage from '@/features/site/pages/ToolDirectoryPage'
import { TOOL_SCREENS } from './tool-screens'
import { ToolRouteFallback } from './ToolRouteFallback'

const ToolRoutePage = dynamic(() => import('@/features/tools/hub/pages/ToolRoutePage'), { ssr: false, loading: ToolRouteFallback })
const routes: RouteObject[] = [{ path: ROUTES.docTools, element: <ToolsLayout />, children: [
  { index: true, element: <ToolsHubPage /> },
  { path: 'cong-cu', element: <ToolDirectoryPage /> },
  { path: ':tool', element: <ToolRoutePage screens={TOOL_SCREENS} /> },
] }]

export function ToolsRouter() {
  const pathname = usePathname()
  // Retain the data router so file handoff, screen identity and leave guards keep their behavior.
  const [router] = useState(() => typeof window === 'undefined'
    ? createMemoryRouter(routes, { initialEntries: [pathname ?? ROUTES.docTools] })
    : createBrowserRouter(routes))
  return <RouterProvider router={router} />
}
