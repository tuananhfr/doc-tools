import type { MouseEvent } from 'react'
import Image from 'next/image'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useLocale } from '@/i18n/I18nProvider'
import { LOCALES, type Locale } from '@/i18n/locales'
import { localeHref, switchLocale } from '@/i18n/switch-locale'
import { withBase } from '@/utils/url'
import { ThemeSelector } from './ThemeSelector'

export function PreferencesSection() {
  const { t } = useTranslation('site')
  const locale = useLocale()
  const { pathname } = useLocation()
  const choose = (event: MouseEvent<HTMLAnchorElement>, target: Locale) => {
    event.preventDefault()
    if (target !== locale) switchLocale(event.currentTarget.getAttribute('href')!, target)
  }
  return (
    <section id="ngon-ngu-giao-dien" className="cn-landing-section cn-landing-container cn-landing-personal" aria-labelledby="cn-landing-personal-title">
      <div className="cn-landing-section-heading"><h2 id="cn-landing-personal-title">{t('landing.preferences.title')}</h2><p>{t('landing.preferences.body', { total: LOCALES.length })}</p></div>
      <div className="cn-landing-personal-grid">
        <div className="cn-landing-languages"><h3>{t('landing.preferences.choose')}</h3><ul>{LOCALES.map(item => <li key={item.code}><a href={localeHref(pathname, item.code)} hrefLang={item.tag} lang={item.tag} dir={item.dir} aria-current={item.code === locale ? 'true' : undefined} onClick={event => choose(event, item.code)}>{item.label}{item.code === locale ? <Icon name="check2" /> : null}</a></li>)}</ul><p>{t('landing.preferences.languageNote')}</p></div>
        <div className="cn-landing-theme-showcase"><div className="cn-landing-theme-previews">{(['light', 'dark'] as const).map(mode => <figure key={mode}><figcaption><Icon name={mode === 'light' ? 'sun' : 'moon-stars'} />{t(`landing.preferences.${mode}`)}</figcaption><Image src={withBase(`/landing/directory-${mode}.webp`)} alt={t(`landing.preview.${mode}`)} width={720} height={900} sizes="(max-width: 767px) 44vw, 27vw" /></figure>)}</div><ThemeSelector /><p className="cn-landing-note">{t('landing.preferences.themeNote')}</p></div>
      </div>
    </section>
  )
}
