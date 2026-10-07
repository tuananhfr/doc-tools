import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import type { AccountUser } from '../types/account.types'

/** The name shows only if the profile also allows it, so the default follows the profile. */
export const defaultAttribution = (user: AccountUser) => user.publicAttribution && Boolean(user.displayName)

interface Props {
  user: AccountUser
  attribution: boolean
  onAttributionChange: (value: boolean) => void
  /** Set once the backend confirmed it filed the contribution under this account. */
  tracked: boolean
}

/** Shown inside a contribution form for a signed-in user; guests keep the receipt-code flow. */
export function ContributionAccountBox({ user, attribution, onAttributionChange, tracked }: Props) {
  const { t } = useTranslation('account')
  const profileReady = defaultAttribution(user)

  if (tracked) {
    return (
      <p className="cn-contribution-box is-done" role="status">
        <Icon name="check-circle-fill" />
        <span><Trans ns="account" i18nKey="box.tracked" components={{ mine: <Link to="/de-xuat-cua-toi" /> }} /></span>
      </p>
    )
  }
  return (
    <div className="cn-contribution-box">
      <p className="cn-contribution-box__who">
        <Icon name="person-check" />
        <span><Trans ns="account" i18nKey="box.signedInAs" values={{ email: user.email }} components={{ strong: <strong /> }} /></span>
      </p>
      <label className="cn-check">
        <input type="checkbox" className="form-check-input" checked={attribution} onChange={(event) => onAttributionChange(event.target.checked)} />
        <span>{t('box.attribution')}</span>
      </label>
      {attribution && !profileReady ? (
        <p className="cn-field-help">
          <Trans ns="account" i18nKey="box.profileHint" components={{ account: <Link to="/tai-khoan" /> }} />
        </p>
      ) : null}
    </div>
  )
}
