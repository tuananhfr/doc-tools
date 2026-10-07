import { useTranslation } from 'react-i18next'
import { READY_TOOL_COUNT } from '@/features/site/config/home-content'

export function HeroStats() {
  const { t } = useTranslation('common')
  return (
    <dl className="cn-hero-stats">
      <div><dt>{t('hero.statTools')}</dt><dd>{READY_TOOL_COUNT}</dd></div>
      <div><dt>{t('hero.statFree')}</dt><dd>100%</dd></div>
      <div><dt>{t('hero.statInstall')}</dt><dd>0</dd></div>
    </dl>
  )
}
