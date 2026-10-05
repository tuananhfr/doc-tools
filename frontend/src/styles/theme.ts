/**
 * Lop 3 - Component: dua semantic token vao DOM duoi dang bien CSS.
 *
 * Bootstrap doc lai cac bien nay trong `styles/base/tokens.css`, nho vay ca ba
 * theme (Light / Dark / Field) dung CHUNG component, chi khac token
 * (ERPcons_Design_System.md, muc 12 & 15).
 */
import {
  fontFamily,
  layout,
  radius,
  themeTokens,
  type SemanticTokens,
  type ThemeMode,
} from './tokens'

/** Ten bien CSS de dung trong file .css: var(--erp-brand). */
export function themeCssVars(tokens: SemanticTokens): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      vars[`--erp-${kebab(key)}`] = value
    } else {
      // Nhom long nhau (vd chart.planned) -> --erp-chart-planned.
      for (const [childKey, childValue] of Object.entries(value)) {
        vars[`--erp-${kebab(key)}-${kebab(childKey)}`] = String(childValue)
      }
    }
  }

  for (const [key, value] of Object.entries(radius)) {
    vars[`--erp-radius-${key}`] = `${value}px`
  }

  vars['--erp-header-height'] = `${layout.headerHeight}px`
  vars['--erp-sidebar-width'] = `${layout.sidebarWidth}px`
  vars['--erp-sidebar-collapsed-width'] = `${layout.sidebarCollapsedWidth}px`
  vars['--erp-content-max-width'] = `${layout.contentMaxWidth}px`
  vars['--erp-touch-target'] = `${layout.touchTarget}px`
  vars['--erp-font-family'] = fontFamily

  return vars
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

/**
 * Gan bien CSS + data-theme len <html>. Goi mot lan moi khi doi theme.
 *
 * `data-bs-theme` la co cua Bootstrap 5.3 (dung cho form control, close button,
 * bong do...); `data-theme` la co rieng cua ERPCons de phan biet ca Field Mode.
 */
export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  const tokens = themeTokens[mode]

  for (const [name, value] of Object.entries(themeCssVars(tokens))) {
    root.style.setProperty(name, value)
  }

  root.dataset.theme = mode
  root.dataset.bsTheme = mode === 'dark' ? 'dark' : 'light'
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light'
}
