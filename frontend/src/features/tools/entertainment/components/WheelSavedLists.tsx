import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolPanel } from '@/features/tools/hub'
import { useWheelLists } from '../hooks/useWheelLists'
import { MAX_LIST_NAME, MAX_SAVED_LISTS, type WheelList } from '../services/wheel-lists.store'
import { WHEEL_LIMITS } from '../utils/spin-wheel'

interface WheelSavedListsProps {
  options: string[]
  disabled: boolean
  onLoad: (list: WheelList) => void
}

export function WheelSavedLists({ options, disabled, onLoad }: WheelSavedListsProps) {
  const { t } = useTranslation('entertainment')
  const { lists, notice, save, remove } = useWheelLists()
  const [name, setName] = useState('')
  const nameId = useId()
  const message = !notice ? ''
    : notice.kind === 'created' ? t('wheel.saved', { name: notice.name })
    : notice.kind === 'replaced' ? t('wheel.replaced', { name: notice.name })
    : notice.kind === 'full' ? t('wheel.full', { max: MAX_SAVED_LISTS })
    : t('wheel.saveFailed')
  const canSave = !disabled && name.trim() !== '' && options.length >= WHEEL_LIMITS.minOptions

  const submit = () => {
    if (canSave && save(name, options)) setName('')
  }
  const confirmRemove = (list: WheelList) => {
    // Lists live only in this browser and have no trash; deleting is final.
    if (window.confirm(t('wheel.confirmRemove', { name: list.name }))) remove(list.id)
  }

  return <ToolPanel title={t('wheel.savedTitle')}>
    <form className="cn-wheel-save" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <label className="erp-flow-field__label" htmlFor={nameId}>{t('wheel.listName')}</label>
      <div className="cn-wheel-save__row">
        <Form.Control id={nameId} value={name} maxLength={MAX_LIST_NAME} placeholder={t('wheel.listNameExample')}
          onChange={(event) => setName(event.target.value)} />
        <Button type="submit" disabled={!canSave}>{t('wheel.save')}</Button>
      </div>
    </form>
    <p className="cn-wheel-status" role="status" aria-live="polite">{message}</p>
    {lists.length
      ? <ul className="erp-tool-rows">{lists.map((list) => <li className="erp-tool-row erp-tool-row--item" key={list.id}>
        <span className="erp-tool-row__value">{list.name}<small className="cn-wheel-list-size">{t('wheel.listSize', { total: list.options.length })}</small></span>
        <span className="cn-wheel-list-actions">
          <Button size="sm" variant="outline-primary" disabled={disabled} aria-label={t('wheel.loadAria', { name: list.name })} onClick={() => onLoad(list)}>{t('wheel.load')}</Button>
          <Button size="sm" variant="link" className="erp-tool-copy" aria-label={t('wheel.removeAria', { name: list.name })} onClick={() => confirmRemove(list)}>{t('wheel.remove')}</Button>
        </span>
      </li>)}</ul>
      : <p className="cn-wheel-help">{t('wheel.savedEmpty')}</p>}
    <p className="cn-wheel-help">{t('wheel.savedNote')}</p>
  </ToolPanel>
}
