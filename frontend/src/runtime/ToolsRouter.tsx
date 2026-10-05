'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { createBrowserRouter, createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { ToolsLayout } from '@/layouts/ToolsLayout'
import ToolsHubPage from '@/features/tools/hub/pages/ToolsHubPage'
import { TOOL_SCREENS } from './tool-screens'
import { ToolRouteFallback } from './ToolRouteFallback'

const ToolRoutePage = dynamic(() => import('@/features/tools/hub/pages/ToolRoutePage'), { ssr: false, loading: ToolRouteFallback })
const routes: RouteObject[] = [{ path: '/doc-tools', element: <ToolsLayout />, children: [
  { index: true, element: <ToolsHubPage /> },
  { path: ':tool', element: <ToolRoutePage screens={TOOL_SCREENS} /> },
] }]

export function ToolsRouter() {
  const pathname = usePathname()
  // Retain the data router so file handoff, screen identity and leave guards keep their behavior.
  const [router] = useState(() => typeof window === 'undefined'
    ? createMemoryRouter(routes, { initialEntries: [pathname?.startsWith('/doc-tools') ? pathname : '/doc-tools'] })
    : createBrowserRouter(routes))
  return <RouterProvider router={router} />
}
