import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import { useSavedItems, useToggleBookmark } from '../hooks/useSavedItems'
import { CloudError } from '../services/cloud.service'

/** Star in a tool's header. Pro only: everyone else keeps the local "recent tools" of the hub. */
export function FavouriteButton({ toolId, pro }: { toolId: string; pro: boolean }) {
  const { t } = useTranslation('cloud')
  const toast = useToast()
  const saved = useSavedItems(pro)
  const toggle = useToggleBookmark()
  if (!pro || !saved.data?.writable) return null
  const on = saved.data.items.some((item) => item.kind === 'bookmark' && item.toolId === toolId)
  return (
    <button
      type="button"
      className={`cn-favourite${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={() => toggle.mutate({ toolId, on: !on }, {
        // The star has already flipped back by now; say why, or it looks like the click was missed.
        onError: (error) => toast.error(t(`errors.${error instanceof CloudError ? error.code : 'UNKNOWN'}`)),
      })}
    >
      <Icon name={on ? 'star-fill' : 'star'} />
      <span>{on ? t('favourite.on') : t('favourite.off')}</span>
    </button>
  )
}
