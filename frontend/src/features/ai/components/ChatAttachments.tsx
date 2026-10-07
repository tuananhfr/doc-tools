import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { ChatAttachment } from '../types/ai.types'

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Chips for the files waiting in the composer. */
export function ChatAttachments({ items, onRemove }: { items: ChatAttachment[]; onRemove: (id: string) => void }) {
  const { t } = useTranslation('ai')
  if (!items.length) return null
  return (
    <ul className="cn-ai-attachments" aria-label={t('chat.attachLabel')}>
      {items.map((item) => (
        <li key={item.id} className={`cn-ai-attachment is-${item.status}`}>
          {item.kind === 'image'
            ? <img className="cn-ai-attachment__thumb" src={item.previewUrl} alt="" />
            : <span className="cn-ai-attachment__thumb is-text" aria-hidden="true"><Icon name="file-earmark-text" /></span>}
          <span className="cn-ai-attachment__meta">
            <span className="cn-ai-attachment__name" title={item.name}>{item.name}</span>
            <span className="cn-ai-attachment__state">
              {item.status === 'uploading' ? t('chat.attachUploading')
                : item.status === 'failed' ? (item.kind === 'image' && item.error ? t(`errors.${item.error}`) : t('chat.attachFailed'))
                  : formatSize(item.size)}
            </span>
          </span>
          <button type="button" className="cn-ai-attachment__remove" aria-label={t('chat.removeAttachment', { name: item.name })} onClick={() => onRemove(item.id)}>
            <Icon name="x-lg" />
          </button>
        </li>
      ))}
    </ul>
  )
}
