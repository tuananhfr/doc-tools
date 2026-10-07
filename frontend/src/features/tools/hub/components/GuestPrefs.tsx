import { Dropdown } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { THEME_LABEL, THEME_SHORT_LABEL, type ThemeMode } from '@/styles/tokens'
import { LanguagePicker } from './LanguagePicker'

const THEME_ICON: Record<ThemeMode, string> = { light: 'sun', dark: 'moon-stars', field: 'brightness-high' }

export function GuestPrefs({ className = '' }: { className?: string }) {
  const { mode, setTheme } = useThemeMode()
  const { t } = useTranslation('common')
  return (
    <div className={`erp-tools-prefs ${className}`.trim()}>
      <LanguagePicker />
      <Dropdown align="end">
        <Dropdown.Toggle variant="ghost" size="sm" id="tools-theme" className="erp-tools-prefs__toggle" aria-label={t('theme.current', { name: t(THEME_LABEL[mode]) })}><Icon name={THEME_ICON[mode]} /></Dropdown.Toggle>
        <Dropdown.Menu>{(Object.keys(THEME_LABEL) as ThemeMode[]).map((value) => <Dropdown.Item key={value} active={value === mode} title={t(THEME_LABEL[value])} onClick={() => setTheme(value)}><Icon name={THEME_ICON[value]} className="me-2" />{t(THEME_SHORT_LABEL[value])}</Dropdown.Item>)}</Dropdown.Menu>
      </Dropdown>
    </div>
  )
}
