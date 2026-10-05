import { Dropdown } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { useThemeMode } from '@/hooks/useThemeTokens'
import { THEME_LABEL, THEME_SHORT_LABEL } from '@/styles/tokens'
import type { ThemeMode } from '@/styles/tokens'

const THEME_ICON: Record<ThemeMode, string> = {
  light: 'sun',
  dark: 'moon-stars',
  field: 'brightness-high',
}

interface GuestPrefsProps {
  /** Đặt trên nền hero tối: chữ + viền sáng thay cho màu chữ của trang. */
  onHero?: boolean
  className?: string
}

/**
 * Ngôn ngữ + giao diện cho khung khách của "Chuyện Nhỏ" — khung này không có dải
 * đầu trang nên hai điều khiển của trang đăng nhập (`AuthLayout`) phải do trang vẽ.
 * Giao diện dùng chung kho với cả app; ngôn ngữ mới có mục chọn, chưa có bản dịch.
 */
export function GuestPrefs({ onHero = false, className = '' }: GuestPrefsProps) {
  const { mode, setTheme } = useThemeMode()
  const toggleClass = `erp-tools-prefs__toggle${onHero ? ' erp-tools-prefs__toggle--on-hero' : ''}`

  return (
    <div className={`erp-tools-prefs ${className}`.trim()}>
      <Dropdown align="end">
        <Dropdown.Toggle variant="ghost" size="sm" id="tools-language" className={toggleClass} aria-label="Ngôn ngữ: Tiếng Việt">
          <Icon name="globe2" /> VI
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item active>Tiếng Việt</Dropdown.Item>
          <Dropdown.Item>English</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <Dropdown align="end">
        <Dropdown.Toggle variant="ghost" size="sm" id="tools-theme" className={toggleClass} aria-label={`Giao diện: ${THEME_LABEL[mode]}`}>
          <Icon name={THEME_ICON[mode]} />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {(Object.keys(THEME_LABEL) as ThemeMode[]).map((value) => (
            <Dropdown.Item key={value} active={value === mode} title={THEME_LABEL[value]} onClick={() => setTheme(value)}>
              <Icon name={THEME_ICON[value]} className="me-2" />
              {THEME_SHORT_LABEL[value]}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  )
}
