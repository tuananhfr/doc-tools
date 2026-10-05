import { useCallback, useSyncExternalStore } from 'react'
import { mediaQuery } from '@/styles/tokens'

/**
 * Doc breakpoint dong bo ngay lan render dau (khong nhap nhay layout)
 * - khac voi Grid.useBreakpoint cua antd chi co ket qua sau effect.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mobile + Tablet: dieu huong chuyen sang Drawer. */
export function useIsCompactNav() {
  return useMediaQuery(mediaQuery.tabletDown)
}

/** Mobile: header rut gon, luoi 1 cot. */
export function useIsMobile() {
  return useMediaQuery(mediaQuery.mobileDown)
}

/**
 * Tablet (577–1024px): bang giu cot cot loi, phan con lai mo theo dong; vung
 * cham 44px. KHAC `useIsCompactNav` — hook do gom ca dien thoai.
 */
export function useIsTablet() {
  return useMediaQuery(mediaQuery.tabletOnly)
}

/** Tablet cảm ứng xoay ngang — xem `mediaQuery.tabletLandscape` (Master-Detail). */
export function useIsTabletLandscape() {
  return useMediaQuery(mediaQuery.tabletLandscape)
}
