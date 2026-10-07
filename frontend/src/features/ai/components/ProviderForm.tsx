import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { useProviderTypes, useRemoveProvider, useSaveProvider, useVerifyModel } from '../hooks/useAiSetup'
import { AiError } from '../services/ai.service'
import type { AiSetup } from '../types/ai.types'
import { AiStatusBadge } from './AiStatusBadge'

function ErrorLine({ error }: { error: unknown }) {
  const { t } = useTranslation('ai')
  if (!error) return null
  // A failed check's own reason (wrong model, no quota…) shows once, in the "last check" box above.
  const code = error instanceof AiError ? error.code : 'UNKNOWN'
  return <p className="cn-form-error" role="alert"><Icon name="exclamation-circle" /><span>{t(`errors.${code}`)}</span></p>
}

export function ProviderForm({ setup }: { setup: AiSetup }) {
  const { t } = useTranslation('ai')
  const types = useProviderTypes(true)
  const save = useSaveProvider()
  const verify = useVerifyModel()
  const remove = useRemoveProvider()
  const saved = setup.provider
  const [type, setType] = useState(saved?.type ?? '')
  // null = untouched, so clearing the field does not snap the default back in.
  const [apiBase, setApiBase] = useState<string | null>(saved?.apiBase ?? null)
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(saved?.model ?? '')
  const [typing, setTyping] = useState(false)

  if (saved?.status === 'disabled') {
    return (
      <section className="cn-account-card" aria-labelledby="cn-ai-provider">
        <div className="cn-account-card__head"><h2 id="cn-ai-provider">{t('provider.title')}</h2><AiStatusBadge status="disabled" /></div>
        <p className="cn-form-error" role="alert"><Icon name="slash-circle" />{t('provider.disabled')}</p>
      </section>
    )
  }

  if (types.isPending) return <section className="cn-account-card"><Skeleton rows={4} /></section>
  const options = types.data ?? []
  const chosenType = type || options[0]?.type || ''
  const option = options.find((entry) => entry.type === chosenType)
  const busy = save.isPending || verify.isPending || remove.isPending

  const onSave = (event: FormEvent) => {
    event.preventDefault()
    if (!option || !apiKey.trim()) return
    verify.reset()
    save.mutate(
      { type: option.type, apiKey: apiKey.trim(), ...(option.customBase ? { apiBase: (apiBase ?? option.apiBase).trim() } : {}) },
      {
        onSuccess: (result) => {
          setApiKey('')
          setModels(result.models)
          setTyping(result.models.length === 0)
          if (!result.models.includes(model)) setModel(result.models[0] ?? '')
        },
      },
    )
  }

  const onVerify = (event: FormEvent) => {
    event.preventDefault()
    if (model.trim()) verify.mutate(model.trim())
  }

  const onRemove = () => {
    if (!window.confirm(t('provider.removeConfirm'))) return
    remove.mutate(undefined, { onSuccess: () => { setModels([]); setModel(''); save.reset(); verify.reset() } })
  }

  const savedLabel = saved ? options.find((entry) => entry.type === saved.type)?.label ?? saved.type : ''

  return (
    <section className="cn-account-card cn-ai-provider" aria-labelledby="cn-ai-provider">
      <div className="cn-account-card__head">
        <h2 id="cn-ai-provider">{t('provider.title')}</h2>
        <AiStatusBadge status={saved?.status ?? 'none'} />
      </div>
      <p className="cn-account-card__text">
        {saved?.model ? t('provider.current', { provider: savedLabel, model: saved.model }) : t('provider.text')}
      </p>
      {saved?.status === 'failed' && saved.lastError ? (
        <p className="cn-ai-provider__last"><Icon name="info-circle" />{t('provider.lastError', { message: saved.lastError })}</p>
      ) : null}

      <form className="cn-account-form" onSubmit={onSave}>
        <label className="cn-field-label" htmlFor="cn-ai-type">{t('provider.type')}</label>
        <select
          id="cn-ai-type"
          className="form-select cn-input"
          value={chosenType}
          disabled={busy}
          onChange={(event) => { setType(event.target.value); setApiBase(null); setModels([]) }}
        >
          {options.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}
        </select>
        {option?.customBase ? (
          <>
            <label className="cn-field-label" htmlFor="cn-ai-base">{t('provider.apiBase')}</label>
            <input
              id="cn-ai-base"
              className="form-control cn-input"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={apiBase ?? option.apiBase}
              disabled={busy}
              onChange={(event) => setApiBase(event.target.value)}
            />
            <p className="cn-field-help">{t('provider.apiBaseHelp')}</p>
          </>
        ) : null}
        <label className="cn-field-label" htmlFor="cn-ai-key">{t('provider.apiKey')}</label>
        <input
          id="cn-ai-key"
          className="form-control cn-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          minLength={8}
          maxLength={500}
          value={apiKey}
          disabled={busy}
          onChange={(event) => setApiKey(event.target.value)}
        />
        <p className="cn-field-help">{saved ? t('provider.apiKeyReplace') : t('provider.apiKeyHelp')}</p>
        <ErrorLine error={save.error} />
        <div className="cn-account-actions">
          <button type="submit" className="cn-button" disabled={busy || apiKey.trim().length < 8}>
            <Icon name="key" />{save.isPending ? t('provider.saving') : t('provider.save')}
          </button>
        </div>
      </form>

      {saved ? (
        <form className="cn-account-form cn-ai-provider__model" onSubmit={onVerify}>
          <label className="cn-field-label" htmlFor="cn-ai-model">{t('provider.model')}</label>
          {models.length && !typing ? (
            <select id="cn-ai-model" className="form-select cn-input" value={model} disabled={busy} onChange={(event) => setModel(event.target.value)}>
              <option value="" disabled>{t('provider.modelPick')}</option>
              {models.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          ) : (
            <input
              id="cn-ai-model"
              className="form-control cn-input"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              value={model}
              disabled={busy}
              onChange={(event) => setModel(event.target.value)}
            />
          )}
          {models.length ? (
            typing ? null : <button type="button" className="cn-link-button" onClick={() => setTyping(true)}>{t('provider.modelManual')}</button>
          ) : (
            <p className="cn-field-help">{save.isSuccess ? t('provider.noModels') : t('provider.modelHelp')}</p>
          )}
          <ErrorLine error={verify.error} />
          <div className="cn-account-actions">
            <button type="submit" className="cn-button" disabled={busy || !model.trim()}>
              <Icon name="shield-check" />{verify.isPending ? t('provider.verifying') : t('provider.verify')}
            </button>
            <button type="button" className="cn-button cn-button--ghost" disabled={busy} onClick={onRemove}>
              <Icon name="trash3" />{remove.isPending ? t('provider.removing') : t('provider.remove')}
            </button>
          </div>
          <ErrorLine error={remove.error} />
        </form>
      ) : null}
    </section>
  )
}
