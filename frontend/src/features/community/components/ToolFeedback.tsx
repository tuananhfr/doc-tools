import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { ToolContext } from '../types/community.types'
import { ContributionForm } from './ContributionForm'

export function ToolFeedback(context: ToolContext) {
  const { t } = useTranslation('community')
  const id = useId()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  useEffect(() => { if (open) panel.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus() }, [open])
  const close = () => { setOpen(false); button.current?.focus() }
  return <div className="cn-tool-feedback">
    <button ref={button} type="button" className="cn-tool-feedback__trigger" aria-expanded={open} aria-controls={id} onClick={() => open ? close() : setOpen(true)}><Icon name="chat-left-text" />{t('feedback.toolAction')}</button>
    <section ref={panel} id={id} hidden={!open} className="cn-tool-feedback__panel" aria-labelledby={`${id}-title`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
      <div className="cn-tool-feedback__head"><h2 id={`${id}-title`}>{t('feedback.title')}</h2><button type="button" aria-label={t('feedback.close')} className="cn-tool-feedback__close" onClick={close}><Icon name="x-lg" /></button></div>
      <ContributionForm mode="feedback" context={context} />
    </section>
  </div>
}
