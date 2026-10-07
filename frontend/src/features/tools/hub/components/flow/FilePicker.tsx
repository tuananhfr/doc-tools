import { useId, useState, type DragEvent, type ReactNode } from 'react'
import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'

export interface PickerCopy {
  /** Thuộc tính `accept` của ô chọn tệp. */
  accept: string
  multiple: boolean
  /** "Chọn tệp PDF cần ghép". */
  title: string
  /** Loại tệp + giới hạn: "PDF · tối đa 100 MB mỗi tệp". */
  hint: string
}

interface FilePickerProps extends PickerCopy {
  /** Đã có tệp: thu lại thành một dải mỏng để danh sách tệp lên trên. */
  compact: boolean
  loading: { done: number; total: number } | null
  disabled: boolean
  onFiles: (files: File[]) => void
  /** Đường vào khác ngoài chọn tệp (chụp ảnh…), đứng cạnh nút chọn tệp. */
  extra?: ReactNode
}

/** Vùng thả + nút chọn tệp của bước 1. */
export function FilePicker({ accept, multiple, title, hint, compact, loading, disabled, onFiles, extra }: FilePickerProps) {
  const inputId = useId()
  const { t } = useTranslation('common')
  const [over, setOver] = useState(false)

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  const pickLabel = compact ? (multiple ? t('filePicker.add') : t('filePicker.pickOther')) : t('filePicker.pick')

  return (
    <section
      className={`erp-flow-picker${compact ? ' erp-flow-picker--compact' : ''}${over ? ' is-over' : ''}`}
      aria-label={t('filePicker.pick')}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={handleDrop}
    >
      <span className="erp-flow-picker__icon">
        <Icon name="cloud-arrow-up" />
      </span>

      <div className="erp-flow-picker__text">
        {loading ? (
          <p className="erp-flow-picker__title" role="status">
            <Spinner as="span" size="sm" className="me-2" />
            {t('filePicker.reading', { current: Math.min(loading.done + 1, loading.total), total: loading.total })}
          </p>
        ) : (
          <h2 className="erp-flow-picker__title">{compact ? (multiple ? t('filePicker.dropMore') : t('filePicker.dropOther')) : title}</h2>
        )}
        <p className="erp-flow-picker__hint">{hint}</p>
      </div>

      <div className="erp-flow-picker__actions">
        <label htmlFor={inputId} className={`btn ${compact ? 'btn-outline-secondary' : 'btn-primary'} erp-flow-picker__pick${disabled || loading ? ' disabled' : ''}`}>
          <Icon name={compact ? 'plus-lg' : 'folder2-open'} className="me-2" />
          {pickLabel}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || loading !== null}
          className="visually-hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ''
            if (files.length > 0) onFiles(files)
          }}
        />
        {extra}
      </div>
    </section>
  )
}
