import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useMe } from '../hooks/useAccount'
import { initialOf } from '../utils/initial'

/** Header entry: "Sign in" for guests, an initial badge for members. Renders a placeholder until `/me` answers so the label never flips. */
export function AccountButton() {
  const { t } = useTranslation('site')
  const { data } = useMe()
  if (!data) return <span className="cn-account-button is-pending" aria-hidden="true" />
  const user = data.user
  if (!user) {
    return (
      <Link className="cn-account-button" to="/dang-nhap">
        <Icon name="person-circle" />
        <span className="cn-account-button__label">{t('header.signIn')}</span>
      </Link>
    )
  }
  return (
    <Link className="cn-account-button is-member" to="/tai-khoan" title={user.email} aria-label={`${t('header.account')}: ${user.email}`}>
      <span className="cn-account-avatar" aria-hidden="true">{initialOf(user.displayName || user.email)}</span>
      <span className="cn-account-button__label">{t('header.account')}</span>
      {data.plan.pro ? <span className="cn-pro-chip">Pro</span> : null}
    </Link>
  )
}
