import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ocrOfflineReady, prepareOcrOffline } from '../../services/ocr-readiness'

export function OcrReadiness() {
  const { t } = useTranslation('pdf')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    const check = () => void ocrOfflineReady().then(value => { if (live) setReady(value) }).catch(() => undefined)
    check()
    navigator.serviceWorker?.addEventListener('controllerchange', check)
    window.addEventListener('online', check)
    return () => { live = false; navigator.serviceWorker?.removeEventListener('controllerchange', check); window.removeEventListener('online', check) }
  }, [])
  const prepare = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const prepared = await prepareOcrOffline()
      setReady(prepared)
      setFailed(!prepared)
    } catch { setFailed(true) }
    finally { setBusy(false) }
  }
  return <div className="cn-ocr-readiness">
    <p role="status">{t(ready ? 'ocrReview.offlineReady' : 'ocrReview.offlineHint')}</p>
    {!ready ? <Button variant="outline-secondary" size="sm" disabled={busy} onClick={() => void prepare()}>{t(busy ? 'ocrReview.preparing' : 'ocrReview.prepare')}</Button> : null}
    {failed ? <p role="alert">{t('ocrReview.prepareFailed')}</p> : null}
  </div>
}
