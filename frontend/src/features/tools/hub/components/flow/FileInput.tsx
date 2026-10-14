import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'

interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  isInvalid?: boolean
}

export function FileInput({ isInvalid, className = '', onChange, disabled, ...props }: FileInputProps) {
  const { t } = useTranslation('common')
  const [names, setNames] = useState('')
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    setNames(Array.from(event.target.files ?? []).map(file => file.name).join(', '))
    onChange?.(event)
  }
  return <span className={`cn-file-input${isInvalid ? ' is-invalid' : ''}${disabled ? ' is-disabled' : ''} ${className}`}>
    <Icon name="folder2-open" aria-hidden="true" />
    <span className="cn-file-input__name" aria-hidden="true">{names || t('filePicker.pick')}</span>
    <input {...props} type="file" aria-invalid={isInvalid || undefined} disabled={disabled} onChange={change} className="cn-file-input__native" />
  </span>
}
