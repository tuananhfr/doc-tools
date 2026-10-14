'use client'
import { useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { addAiImages } from './ai-images'
import { AI_IMAGE_TYPES, AI_IMAGES_MAX, AI_TEXT_MAX } from './embed-protocol'
import { HostAiAnswer } from './HostAiAnswer'
import { useHostAi } from './useHostAi'

/** Single-turn ask box answered by the host page's AI; replaces the Pro chat when embedded. */
export function HostAiAsk() {
  const { t } = useTranslation('ai')
  const inputId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const { state, run } = useHostAi()
  const busy = state.status === 'running'
  const canSend = text.trim() !== '' && text.length <= AI_TEXT_MAX && !busy

  const send = () => run({ task: 'ask', text: text.trim(), images })
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (canSend) send()
  }
  const onPick = (files: FileList | null) => {
    const result = addAiImages(images, Array.from(files ?? []))
    setImages(result.images)
    setRejected(result.rejected.map((file) => file.name))
    // Same file picked again after removal must still fire `change`.
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <section className="cn-host-ai" aria-labelledby={`${inputId}-title`}>
      <header className="cn-host-ai__head">
        <h2 id={`${inputId}-title`}>{t('host.title')}</h2>
        <p>{t('host.privacy')}</p>
      </header>
      <form className="cn-host-ai__form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor={inputId}>{t('host.askLabel')}</label>
        <textarea
          id={inputId}
          className="form-control"
          rows={4}
          maxLength={AI_TEXT_MAX}
          value={text}
          placeholder={t('host.askPlaceholder')}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="cn-host-ai__bar">
          <span className="cn-host-ai__count">{t('host.counter', { used: text.length, max: AI_TEXT_MAX })}</span>
          <input ref={fileInput} type="file" accept={AI_IMAGE_TYPES.join(',')} multiple hidden onChange={(event) => onPick(event.target.files)} />
          <button type="button" className="cn-button cn-button--ghost" disabled={images.length >= AI_IMAGES_MAX} onClick={() => fileInput.current?.click()}>
            <Icon name="paperclip" />{t('host.attach')}
          </button>
          <button type="submit" className="cn-button" disabled={!canSend}>
            <Icon name="send" />{t('host.send')}
          </button>
        </div>
        <p className="cn-host-ai__hint">{t('host.attachHint', { max: AI_IMAGES_MAX })}</p>
        {images.length > 0 ? (
          <ul className="cn-host-ai__files">
            {images.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <Icon name="image" />
                <span>{file.name}</span>
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  aria-label={t('host.removeImage', { name: file.name })}
                  onClick={() => setImages((current) => current.filter((_, position) => position !== index))}
                >
                  <Icon name="x-lg" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {rejected.length > 0 ? <p className="cn-host-ai__rejected" role="alert">{t('host.imageRejected', { names: rejected.join(', '), max: AI_IMAGES_MAX })}</p> : null}
      </form>
      <HostAiAnswer state={state} onRetry={send} />
    </section>
  )
}
