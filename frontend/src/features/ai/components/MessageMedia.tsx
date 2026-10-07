import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { ChatMedia } from '../types/ai.types'

/** GoClaw's signed links last a few minutes; an expired one falls back to the file name. */
function MediaImage({ media }: { media: ChatMedia }) {
  const { t } = useTranslation('ai')
  const [broken, setBroken] = useState(false)
  const label = media.name ? t('chat.attachedImage', { name: media.name }) : t('chat.attachedImageUnnamed')
  if (broken) return <span className="cn-ai-file"><Icon name="image" />{label}</span>
  return (
    <a className="cn-ai-media__image" href={media.url} target="_blank" rel="noopener noreferrer">
      <img src={media.url} alt={label} loading="lazy" onError={() => setBroken(true)} />
    </a>
  )
}

export function MessageMedia({ media, files = [] }: { media?: ChatMedia[]; files?: { name: string }[] }) {
  const { t } = useTranslation('ai')
  if (!media?.length && !files.length) return null
  return (
    <div className="cn-ai-media">
      {media?.map((item, index) => item.kind === 'image'
        ? <MediaImage key={`m${index}`} media={item} />
        : <a key={`m${index}`} className="cn-ai-file" href={item.url} target="_blank" rel="noopener noreferrer"><Icon name="file-earmark" />{item.name || t('chat.attachedFileUnnamed')}</a>)}
      {files.map((file, index) => <span key={`f${index}`} className="cn-ai-file"><Icon name="file-earmark-text" />{t('chat.attachedFile', { name: file.name })}</span>)}
    </div>
  )
}
