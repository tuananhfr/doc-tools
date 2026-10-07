import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useUpdateProfile } from '../hooks/useAccount'
import type { AccountUser } from '../types/account.types'
import { accountErrorCode } from '../utils/account-error'

const MAX_NAME = 80

export function ProfileForm({ user }: { user: AccountUser }) {
  const { t } = useTranslation('account')
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [publicAttribution, setPublicAttribution] = useState(user.publicAttribution)
  const update = useUpdateProfile()
  const dirty = displayName.trim() !== (user.displayName ?? '') || publicAttribution !== user.publicAttribution

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!dirty || update.isPending) return
    update.mutate({ displayName: displayName.trim(), publicAttribution }, {
      onSuccess: (state) => setDisplayName(state.user?.displayName ?? ''),
    })
  }

  return (
    <section className="cn-account-card" aria-labelledby="cn-account-profile">
      <div className="cn-account-card__head">
        <h2 id="cn-account-profile">{t('account.profile.title')}</h2>
      </div>
      <p className="cn-account-card__text">{t('account.profile.text')}</p>
      <form className="cn-account-form" onSubmit={submit} noValidate>
        <label className="cn-field-label" htmlFor="cn-profile-name">{t('account.profile.displayName')}</label>
        <input
          id="cn-profile-name"
          className="form-control cn-input"
          type="text"
          autoComplete="name"
          maxLength={MAX_NAME}
          value={displayName}
          onChange={(event) => { setDisplayName(event.target.value); update.reset() }}
          aria-describedby="cn-profile-name-help"
        />
        <p id="cn-profile-name-help" className="cn-field-help">{t('account.profile.displayNameHelp')}</p>
        <label className="cn-check">
          <input type="checkbox" className="form-check-input" checked={publicAttribution} onChange={(event) => { setPublicAttribution(event.target.checked); update.reset() }} />
          <span>{t('account.profile.publicAttribution')}</span>
        </label>
        {update.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(update.error)}`)}</p> : null}
        <div className="cn-account-actions">
          <button className="cn-button" type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? t('account.profile.saving') : t('account.profile.save')}
          </button>
          {update.isSuccess && !dirty ? <span className="cn-form-notice" role="status"><Icon name="check2" />{t('account.profile.saved')}</span> : null}
        </div>
      </form>
    </section>
  )
}
