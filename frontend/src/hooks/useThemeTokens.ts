import { useAppStore } from '@/store/app.store'
import { themeTokens } from '@/styles/tokens'
import type { SemanticTokens, ThemeMode } from '@/styles/tokens'

/**
 * Cong duy nhat de component doc mau. Khong hardcode hex trong component
 * (ERPcons_Design_System.md, muc 19).
 */
export function useThemeTokens(): SemanticTokens {
  const mode = useAppStore((s) => s.theme)
  return themeTokens[mode]
}

/** Doc/ghi theme hien tai cho cac control doi giao dien. */
export function useThemeMode() {
  const mode = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  return { mode: mode as ThemeMode, setTheme, toggleTheme }
}
