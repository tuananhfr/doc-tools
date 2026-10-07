import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { useAddEvidence } from '../hooks/useAccount'
import { SOURCE_TYPES, type SourceRef } from '../types/account.types'
import { accountErrorCode } from '../utils/account-error'
import { isHttpsUrl } from '../utils/source-url'

interface Props { contributionId: string; onDone: () => void; onAdded: () => void }

export function EvidenceForm({ contributionId, onDone, onAdded }: Props) {
  const { t } = useTranslation('account')
  const { t: tCommunity } = useTranslation('community')
  const id = useId()
  const [url, setUrl] = useState('')
  const [type, setType] = useState<SourceRef['type']>('OFFICIAL_WEB')
  const [invalid, setInvalid] = useState(false)
  const add = useAddEvidence()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (add.isPending) return
    if (!isHttpsUrl(url)) { setInvalid(true); return }
    add.mutate({ id: contributionId, sourceRefs: [{ url: url.trim(), type }] }, { onSuccess: () => { onAdded(); onDone() } })
  }

  return (
    <form className="cn-evidence-form" onSubmit={submit} noValidate>
      <div className="cn-evidence-form__fields">
        <div className="cn-account-form">
          <label className="cn-field-label" htmlFor={`${id}-url`}>{t('mine.evidence.url')}</label>
          <input
            id={`${id}-url`}
            className="form-control cn-input"
            type="url"
            inputMode="url"
            maxLength={2048}
            placeholder="https://"
            value={url}
            aria-invalid={invalid}
            aria-describedby={`${id}-help`}
            onChange={(event) => { setUrl(event.target.value); setInvalid(false); add.reset() }}
          />
        </div>
        <div className="cn-account-form">
          <label className="cn-field-label" htmlFor={`${id}-type`}>{t('mine.evidence.type')}</label>
          <select id={`${id}-type`} className="form-select cn-input" value={type} onChange={(event) => setType(event.target.value as SourceRef['type'])}>
            {SOURCE_TYPES.map((value) => <option key={value} value={value}>{tCommunity(`contribution.sourceTypes.${value}`)}</option>)}
          </select>
        </div>
      </div>
      <p id={`${id}-help`} className="cn-field-help">{t('mine.evidence.help')}</p>
      {invalid ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t('mine.evidence.httpsOnly')}</p> : null}
      {add.isError ? <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${accountErrorCode(add.error)}`)}</p> : null}
      <div className="cn-account-actions">
        <button className="cn-button" type="submit" disabled={add.isPending || !url.trim()}>
          <Icon name="plus-lg" />{add.isPending ? t('mine.evidence.submitting') : t('mine.evidence.submit')}
        </button>
        <button className="cn-link-button" type="button" onClick={onDone}>{t('mine.evidence.cancel')}</button>
      </div>
    </form>
  )
}
