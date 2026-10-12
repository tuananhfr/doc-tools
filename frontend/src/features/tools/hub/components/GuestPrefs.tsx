import { Dropdown } from 'react-bootstrap'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { THEME_LABEL, THEME_SHORT_LABEL, type ThemeMode } from '@/styles/tokens'
import { useTextSize } from '../hooks/useTextSize'
import { TEXT_SIZES, type TextSize } from '../utils/text-size'
import { LanguagePicker } from './LanguagePicker'

const THEME_ICON: Record<ThemeMode, string> = { light: 'sun', dark: 'moon-stars', field: 'brightness-high' }
const TEXT_SIZE_ICON: Record<TextSize, string> = { normal: 'type', large: 'type-h1' }
const TEXT_SIZE_LABEL = { normal: 'textSize.normal', large: 'textSize.large' } as const satisfies Record<TextSize, string>

// "Chữ lớn" nằm chung menu giao diện: header đã chật (CLAUDE.md), thêm một nút nữa là vỡ hàng ở 360px.
export function GuestPrefs({ className = '' }: { className?: string }) {
  const id = useId()
  const { mode, setTheme } = useThemeMode()
  const { size, setSize } = useTextSize()
  const { t } = useTranslation('common')
  return (
    <div className={`erp-tools-prefs ${className}`.trim()}>
      <LanguagePicker />
      <Dropdown align="end">
        <Dropdown.Toggle variant="ghost" size="sm" id={`${id}-theme`} className="erp-tools-prefs__toggle" aria-label={t('textSize.toggle', { theme: t(THEME_LABEL[mode]), size: t(TEXT_SIZE_LABEL[size]) })}><Icon name={THEME_ICON[mode]} /></Dropdown.Toggle>
        <Dropdown.Menu>
          {(Object.keys(THEME_LABEL) as ThemeMode[]).map((value) => <Dropdown.Item key={value} active={value === mode} title={t(THEME_LABEL[value])} onClick={() => setTheme(value)}><Icon name={THEME_ICON[value]} className="me-2" />{t(THEME_SHORT_LABEL[value])}</Dropdown.Item>)}
          <Dropdown.Divider />
          <Dropdown.Header>{t('textSize.label')}</Dropdown.Header>
          {TEXT_SIZES.map((value) => <Dropdown.Item key={value} active={value === size} data-text-size-option={value} onClick={() => setSize(value)}><Icon name={TEXT_SIZE_ICON[value]} className="me-2" />{t(TEXT_SIZE_LABEL[value])}</Dropdown.Item>)}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}
