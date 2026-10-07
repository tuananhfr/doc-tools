import { useId, useState } from 'react'
import { Dropdown } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { copyText } from '@/features/tools/hub/utils/clipboard'
import { canShareSite, currentSiteShare, shareSite, siteShareLinks, type SiteShareData } from '../utils/site-share'

export function SiteShare() {
  const { t } = useTranslation('site')
  const id = useId()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<SiteShareData | null>(null)
  const [nativeAvailable, setNativeAvailable] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const links = data ? siteShareLinks(data) : null

  const toggle = (nextOpen: boolean) => {
    if (nextOpen) {
      const current = currentSiteShare()
      setData(current)
      setNativeAvailable(canShareSite(current))
      setMessage('')
    }
    setOpen(nextOpen)
  }

  const copy = async () => {
    if (!data || pending) return
    setPending(true)
    setMessage('')
    const copied = await copyText(data.url)
    setMessage(copied ? t('share.copied') : t('share.copyFailed'))
    setPending(false)
  }

  const share = async () => {
    if (!data || pending) return
    setPending(true)
    setMessage('')
    try {
      await shareSite(data)
    } catch {
      setMessage(t('share.shareFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dropdown className="cn-share" align="end" autoClose="outside" show={open} onToggle={toggle}>
      <Dropdown.Toggle id={`${id}-toggle`} className="cn-icon-button cn-share-toggle" variant="ghost" aria-label={t('share.button')} title={t('share.button')} aria-controls={`${id}-panel`}>
        <Icon name="share" />
      </Dropdown.Toggle>
      <Dropdown.Menu id={`${id}-panel`} className="cn-share-panel" aria-labelledby={`${id}-toggle`}>
        <h2 className="cn-share-title">{t('share.title')}</h2>
        <p className="cn-share-description">{t('share.description')}</p>
        <label className="visually-hidden" htmlFor={`${id}-url`}>{t('share.urlLabel')}</label>
        <input id={`${id}-url`} className="cn-share-url" type="text" value={data?.url ?? ''} readOnly onFocus={(event) => event.currentTarget.select()} />
        <div className="cn-share-options">
          <button className="cn-share-option cn-share-option--primary" type="button" disabled={pending} onClick={() => void copy()}><Icon name="copy" />{t('share.copy')}</button>
          <button className="cn-share-option" type="button" disabled={!nativeAvailable || pending} aria-describedby={!nativeAvailable ? `${id}-hint` : undefined} onClick={() => void share()}><Icon name="box-arrow-up" />{t('share.native')}</button>
          {links && <div className="cn-share-platforms">
            <a className="cn-share-option" href={links.facebook} target="_blank" rel="noopener noreferrer"><Icon name="facebook" />Facebook</a>
            <a className="cn-share-option" href={links.telegram} target="_blank" rel="noopener noreferrer"><Icon name="telegram" />Telegram</a>
          </div>}
        </div>
        {!nativeAvailable && <p id={`${id}-hint`} className="cn-share-hint">{t('share.unsupported')}</p>}
        <p className="cn-share-status" role="status" aria-live="polite">{message}</p>
      </Dropdown.Menu>
    </Dropdown>
  )
}
