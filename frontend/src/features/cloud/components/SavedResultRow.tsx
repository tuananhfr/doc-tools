import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { formatFileSize } from '@/utils/format'
import { useRemoveSaved, useUpdateSaved } from '../hooks/useSavedItems'
import { CloudError } from '../services/cloud.service'
import type { SavedMeta } from '../types/cloud.types'
import { savedStamp } from '../utils/saved-format'

interface Props { item: SavedMeta; toolName: string | null; toolIcon: string | null; openTo: string | null; writable: boolean }

export function SavedResultRow({ item, toolName, toolIcon, openTo, writable }: Props) {
  const { t } = useTranslation('cloud')
  const update = useUpdateSaved()
  const remove = useRemoveSaved()
  const [name, setName] = useState<string | null>(null)
  const error = update.error ?? remove.error

  const rename = (event: FormEvent, force = false) => {
    event.preventDefault()
    const title = name?.trim()
    if (!title) return
    update.mutate({ id: item.id, title, baseRev: item.rev, force }, {
      onSuccess: () => setName(null),
      onError: (failure) => {
        if (failure instanceof CloudError && failure.code === 'SAVED_CONFLICT' && failure.current
          && window.confirm(t('bar.conflict', { title: failure.current.title, date: savedStamp(failure.current.updatedAt) }))) rename(event, true)
      },
    })
  }

  return (
    <li className="cn-saved-row">
      <span className="cn-saved-row__icon"><Icon name={toolIcon ?? 'file-earmark'} /></span>
      {name === null ? (
        <div className="cn-saved-row__text">
          <strong>{item.title}</strong>
          <span>{toolName ?? t('page.unknownTool')} · {t('page.updated', { date: savedStamp(item.updatedAt) })} · {formatFileSize(item.size)}</span>
        </div>
      ) : (
        <form className="cn-saved-row__rename" onSubmit={rename}>
          <input className="form-control" aria-label={t('page.renameLabel')} value={name} maxLength={120} autoFocus onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="cn-button" disabled={update.isPending || !name.trim()}>{t('bar.confirm')}</button>
          <button type="button" className="cn-button cn-button--ghost" onClick={() => setName(null)}>{t('bar.cancel')}</button>
        </form>
      )}
      {name === null ? (
        <div className="cn-saved-row__actions">
          {openTo ? <Link className="cn-button cn-button--ghost" to={openTo}><Icon name="box-arrow-up-right" />{t('page.open')}</Link> : null}
          {writable ? (
            <button type="button" className="cn-icon-button" aria-label={t('page.rename', { title: item.title })} title={t('page.renameLabel')} onClick={() => setName(item.title)}>
              <Icon name="pencil" />
            </button>
          ) : null}
          <button
            type="button"
            className="cn-icon-button is-danger"
            aria-label={t('page.remove', { title: item.title })}
            title={t('page.removeLabel')}
            disabled={remove.isPending}
            onClick={() => { if (window.confirm(t('page.removeConfirm', { title: item.title }))) remove.mutate(item.id) }}
          >
            <Icon name="trash3" />
          </button>
        </div>
      ) : null}
      {error ? <p className="cn-form-error cn-saved-row__error" role="alert"><Icon name="exclamation-circle" />{t(`errors.${error instanceof CloudError ? error.code : 'UNKNOWN'}`)}</p> : null}
    </li>
  )
}
