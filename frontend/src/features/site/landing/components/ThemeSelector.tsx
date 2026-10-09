import { Dropdown } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { THEME_SHORT_LABEL, type ThemeMode } from '@/styles/tokens'

const MODES = [{ mode: 'light', icon: 'sun' }, { mode: 'dark', icon: 'moon-stars' }, { mode: 'field', icon: 'brightness-high' }] as const

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { mode, setTheme } = useThemeMode()
  const { t } = useTranslation('common')
  const label = (value: ThemeMode) => t('theme.current', { name: t(THEME_SHORT_LABEL[value]) })
  return (
    <div className={`cn-landing-theme${compact ? ' is-compact' : ''}`} role="group" aria-label={t('theme.current', { name: t(THEME_SHORT_LABEL[mode]) })}>
      {MODES.filter(item => !compact || item.mode !== 'field').map(item => <button key={item.mode} type="button" title={label(item.mode)} aria-label={label(item.mode)} aria-pressed={mode === item.mode} onClick={() => setTheme(item.mode)}><Icon name={item.icon} />{compact ? null : <span>{t(THEME_SHORT_LABEL[item.mode])}</span>}</button>)}
      {compact ? <Dropdown align="end"><Dropdown.Toggle variant="ghost" className="cn-landing-theme-more" aria-label={label('field')} title={label('field')}><Icon name="three-dots" /></Dropdown.Toggle><Dropdown.Menu><Dropdown.Item active={mode === 'field'} onClick={() => setTheme('field')}><Icon name="brightness-high" className="me-2" />{t('theme.fieldShort')}</Dropdown.Item></Dropdown.Menu></Dropdown> : null}
    </div>
  )
}
