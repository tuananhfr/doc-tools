import { Dropdown } from 'react-bootstrap'
import { Icon } from '@/components/ui/Icon'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { THEME_LABEL, THEME_SHORT_LABEL, type ThemeMode } from '@/styles/tokens'

const THEME_ICON: Record<ThemeMode, string> = { light: 'sun', dark: 'moon-stars', field: 'brightness-high' }

export function GuestPrefs({ className = '' }: { className?: string }) {
  const { mode, setTheme } = useThemeMode()
  return (
    <div className={`erp-tools-prefs ${className}`.trim()}>
      <span className="cn-language" aria-label="Ngôn ngữ: Tiếng Việt"><Icon name="globe2" /> VI</span>
      <Dropdown align="end">
        <Dropdown.Toggle variant="ghost" size="sm" id="tools-theme" className="erp-tools-prefs__toggle" aria-label={`Giao diện: ${THEME_LABEL[mode]}`}><Icon name={THEME_ICON[mode]} /></Dropdown.Toggle>
        <Dropdown.Menu>{(Object.keys(THEME_LABEL) as ThemeMode[]).map((value) => <Dropdown.Item key={value} active={value === mode} title={THEME_LABEL[value]} onClick={() => setTheme(value)}><Icon name={THEME_ICON[value]} className="me-2" />{THEME_SHORT_LABEL[value]}</Dropdown.Item>)}</Dropdown.Menu>
      </Dropdown>
    </div>
  )
}
