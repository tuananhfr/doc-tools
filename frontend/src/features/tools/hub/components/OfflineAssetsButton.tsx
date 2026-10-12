import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { assetsCached, offlineCacheReady, offlineGroupUrls, prepareAssets, type OfflineAssetGroup } from '../services/offline-assets'

type ButtonState = 'checking' | 'idle' | 'preparing' | 'ready' | 'failed' | 'unsupported'

/** Người dùng tự bấm mới tải: các nhóm này vài chục MB, precache cho mọi người là phí dung lượng của đa số. */
export function OfflineAssetsButton({ group, bytes }: { group: OfflineAssetGroup; bytes?: number }) {
  const { t } = useTranslation('common')
  const [state, setState] = useState<ButtonState>('checking')
  const [urls, setUrls] = useState<string[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    let alive = true
    void (async () => {
      if (!offlineCacheReady()) { if (alive) setState('unsupported'); return }
      const found = await offlineGroupUrls(group)
      if (!alive) return
      if (!found) { setState('unsupported'); return }
      setUrls(found)
      setState(await assetsCached(found, caches) ? 'ready' : 'idle')
    })()
    return () => { alive = false }
  }, [group])

  async function prepare() {
    setState('preparing')
    setProgress({ done: 0, total: urls.length })
    const fetched = await prepareAssets(urls, fetch, (done, total) => setProgress({ done, total }))
    setState(fetched && await assetsCached(urls, caches) ? 'ready' : 'failed')
  }

  if (state === 'checking') return null
  return (
    <div className="cn-offline-assets" data-offline-assets={state}>
      {state === 'idle' || state === 'failed' ? (
        <Button variant="outline-secondary" onClick={() => void prepare()}>
          <Icon name="cloud-download" /> {t('tool.offlineAssets.prepare')}{bytes ? ` (${t('tool.offlineAssets.size', { size: Math.round(bytes / 1e6) })})` : ''}
        </Button>
      ) : null}
      {state === 'preparing' ? <p className="cn-offline-assets__note" role="status">{t('tool.offlineAssets.preparing', progress)}</p> : null}
      {state === 'ready' ? <p className="cn-offline-assets__note" role="status"><Icon name="check-circle" /> {t('tool.offlineAssets.ready')}</p> : null}
      {state === 'failed' ? <p className="cn-offline-assets__note" role="alert">{t('tool.offlineAssets.failed')}</p> : null}
      {state === 'unsupported' ? <p className="cn-offline-assets__note">{t('tool.offlineAssets.unsupported')}</p> : null}
      {state !== 'unsupported' ? <p className="cn-offline-assets__note">{t('tool.offlineAssets.eviction')}</p> : null}
    </div>
  )
}
