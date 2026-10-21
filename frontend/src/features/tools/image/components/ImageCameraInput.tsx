import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'

/** Native photo capture on phones, system picker fallback on other devices. */
export function ImageCameraInput({ disabled, onFiles }: { disabled: boolean; onFiles: (files: File[]) => void }) {
  const id = useId()
  const { t } = useTranslation('image', { keyPrefix: 'idPhotoStudio' })
  return <><label htmlFor={id} className={`btn btn-outline-primary${disabled ? ' disabled' : ''}`}><Icon name="camera" />{t('camera')}</label><input id={id} type="file" className="visually-hidden" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={t('camera')} disabled={disabled} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) onFiles(files) }} /></>
}
