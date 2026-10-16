import { useId, useState, type ReactNode } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { formatFileSize } from '@/utils/format'
import { withBase } from '@/utils/url'
import type { ImageFiles } from '../hooks/useImageFiles'

interface ImageStudioUploadProps {
  images: ImageFiles
  disabled: boolean
  sampleBusy: boolean
  sampleFailed: boolean
  sampleUrl: string
  sampleLabel: string
  onFiles: (files: File[]) => void
  onCamera: () => void
  onSample: () => void
  onClear: () => void
  children?: ReactNode
}

/** Shared upload, camera, sample and rejection UI for the approved photo-tool layout. */
export function ImageStudioUpload({ images, disabled, sampleBusy, sampleFailed, sampleUrl, sampleLabel, onFiles, onCamera, onSample, onClear, children }: ImageStudioUploadProps) {
  const { t } = useTranslation('image')
  const { t: s } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  const id = useId()
  const [over, setOver] = useState(false)
  const item = images.items[0] ?? null
  return <section className="cn-idstudio-panel cn-idstudio-upload" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}><span>1.</span> {s('upload')}</h2>
    <div className={`cn-idstudio-drop${over ? ' is-over' : ''}`} onDragOver={event => { event.preventDefault(); if (!disabled) setOver(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false) }} onDrop={event => { event.preventDefault(); setOver(false); if (!disabled) onFiles(Array.from(event.dataTransfer.files)) }}>
      {item ? <img className="cn-idstudio-uploaded" src={item.thumbnail ?? item.url} alt={s('selectedPhoto')} /> : <Icon name="cloud-arrow-up" />}
      <strong>{item ? item.name : s('dropTitle')}</strong><span>{item ? formatFileSize(item.size) : s('dropHint')}</span>
      <label htmlFor={`${id}-file`} className={`btn btn-primary${disabled ? ' disabled' : ''}`}>{images.loading || sampleBusy ? <Spinner as="span" size="sm" /> : null}{item ? s('changePhoto') : s('choosePhoto')}</label>
      <input id={`${id}-file`} type="file" className="visually-hidden" aria-label={s('choosePhoto')} accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={disabled} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) onFiles(files) }} />
      <small>{t('shell.hint')}</small>
    </div>
    <div className="cn-idstudio-or"><span>{s('or')}</span></div>
    <div className="cn-idstudio-upload-actions"><Button variant="outline-primary" disabled={disabled} onClick={onCamera}><Icon name="camera" />{s('camera')}</Button><Button variant="outline-primary" disabled={disabled} onClick={onSample}><Icon name="image" />{s('trySample')}</Button></div>
    {images.loading || sampleBusy ? <p role="status" className="cn-idstudio-note">{s('loading')}</p> : null}
    {sampleFailed ? <p role="alert" className="erp-tool-form__error">{s('sampleFailed')}</p> : null}
    {images.rejected.length ? <div className="cn-idstudio-rejected" role="alert">{images.rejected.map((file, index) => <p key={index}><strong>{file.name}</strong>: {file.reason}</p>)}<Button variant="link" onClick={images.dismissRejected}>{s('dismiss')}</Button></div> : null}
    <div className="cn-idstudio-samples"><h3>{s('sampleTitle')}</h3><button type="button" onClick={onSample} disabled={disabled}><img src={withBase(sampleUrl)} alt="" /><span>{sampleLabel}<small>{s('sampleDisclosure')}</small></span><Icon name="arrow-right" /></button></div>
    <p className="cn-idstudio-local"><Icon name="shield-check" />{s('localHint')}</p>
    {item ? <Button variant="link" className="cn-idstudio-remove" disabled={disabled} onClick={onClear}><Icon name="trash3" />{s('removePhoto')}</Button> : null}
    {children}
  </section>
}
