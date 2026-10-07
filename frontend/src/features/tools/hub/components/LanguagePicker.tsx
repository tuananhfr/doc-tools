import type { MouseEvent } from 'react'
import { Dropdown } from 'react-bootstrap'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useLocale } from '@/i18n/I18nProvider'
import { LOCALES, localeInfo, type Locale } from '@/i18n/locales'
import { localeHref, switchLocale } from '@/i18n/switch-locale'

const SHORT_LABEL: Partial<Record<Locale, string>> = { 'zh-hans': '简', 'zh-hant': '繁' }

export function LanguagePicker() {
  const { t } = useTranslation()
  const locale = useLocale()
  // Pathname only: the server router has no query or hash, so including them breaks hydration.
  const { pathname } = useLocation()
  const current = localeInfo(locale)
  const choose = (event: MouseEvent<HTMLAnchorElement>, target: Locale) => {
    event.preventDefault()
    if (target !== locale) switchLocale(event.currentTarget.getAttribute('href')!, target)
  }
  return (
    <Dropdown align="end" className="cn-language">
      <Dropdown.Toggle variant="ghost" size="sm" id="tools-language" className="cn-language__toggle" aria-label={t('language.current', { name: current.label })}>
        <Icon name="globe2" />
        <span className="cn-language__name">{current.label}</span>
        <span className="cn-language__code" aria-hidden="true">{SHORT_LABEL[locale] ?? locale.toUpperCase()}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="cn-language__menu">
        {LOCALES.map(item => (
          <Dropdown.Item key={item.code} href={localeHref(pathname, item.code)} hrefLang={item.tag} lang={item.tag} dir={item.dir} active={item.code === locale} onClick={(event: MouseEvent<HTMLAnchorElement>) => choose(event, item.code)}>
            {item.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}
