import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { dateTimeFormat } from '@/i18n/intl'
import { SUPPORT_EMAIL } from '@/features/site/config/site-navigation'
import { CAPABILITY_ROWS } from '../config/capabilities'
import type { AccountState } from '../types/account.types'

// Pro is granted through a Vietnamese calendar day: `endsAt` is the following midnight there
// (exclusive), so the last valid day is one second earlier, read in that zone.
const PLAN_DATE_OPTIONS = { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' } as const
const lastPlanDay = (endsAt: string) => dateTimeFormat(PLAN_DATE_OPTIONS).format(new Date(Date.parse(endsAt) - 1000))
// Matches the backend reminder mail (REMINDER_DAYS), so the page and the inbox warn at the same time.
const ENDING_SOON_MS = 7 * 86_400_000

export function PlanSection({ account, email }: { account: AccountState; email: string }) {
  const { t } = useTranslation('account')
  const { pro, endsAt } = account.plan
  // Read once per mount: the warning does not need to appear the very second the window opens.
  const [now] = useState(Date.now)
  const endingSoon = pro && endsAt !== null && Date.parse(endsAt) - now <= ENDING_SOON_MS
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('account.pro.mailSubject'))}&body=${encodeURIComponent(t('account.pro.mailBody', { email }))}`

  return (
    <section className="cn-account-card" aria-labelledby="cn-account-plan">
      <div className="cn-account-card__head">
        <h2 id="cn-account-plan">{t('account.plan.title')}</h2>
        <span className={`cn-plan-badge${pro ? ' is-pro' : ''}`}>
          <Icon name={pro ? 'patch-check-fill' : 'person'} />
          {pro ? t('account.plan.pro') : t('account.plan.free')}
        </span>
      </div>
      <p className="cn-account-card__text">
        {pro && endsAt ? t('account.plan.proUntil', { date: lastPlanDay(endsAt) }) : t('account.plan.freeText')}
      </p>
      {endingSoon ? <p className="cn-plan-ending" role="status"><Icon name="hourglass-split" />{t('account.plan.endingSoon')}</p> : null}
      <ul className="cn-capability-list">
        {CAPABILITY_ROWS.map((row) => {
          const has = account.capabilities.includes(row.id)
          return (
            <li key={row.id} className={has ? 'is-included' : 'is-locked'}>
              <Icon name={has ? 'check-circle-fill' : 'lock'} label={has ? t('account.plan.included') : t('account.plan.proOnly')} />
              <span className="cn-capability-name">{t(`account.capability.${row.label}`)}</span>
              {has && !row.live ? <span className="cn-soon-chip">{t('account.plan.soon')}</span> : null}
              {!has && row.pro ? <span className="cn-pro-chip">Pro</span> : null}
            </li>
          )
        })}
      </ul>
      {pro ? null : (
        <div className="cn-pro-offer">
          <div>
            <h3>{t('account.pro.title')}</h3>
            <p>{t('account.pro.text')}</p>
            <p className="cn-pro-offer__price">{t('account.pro.price')}</p>
          </div>
          <a className="cn-button cn-button--navy" href={mailto}><Icon name="envelope" />{t('account.pro.contact')}</a>
        </div>
      )}
    </section>
  )
}
