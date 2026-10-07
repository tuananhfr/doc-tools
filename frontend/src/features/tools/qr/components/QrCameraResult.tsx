import { Button } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { CopyButton } from '@/features/tools/hub'
import type { ScanRead } from '../services/qr-scan'
import { formatLabel, readScanContent } from '../utils/scan-content'

export function QrCameraResult({ read, onResume }: { read: ScanRead; onResume: () => void }) {
  const { t } = useTranslation('qr')
  const content = readScanContent(read.text)
  const shown = content.kind === 'wifi' ? content.ssid : read.text
  return (
    <div className="erp-qr-scanner__result">
      <p className="erp-qr-scanner__format">{formatLabel(read.format)}</p>
      <p className="erp-qr-scanner__text" title={shown} dir="auto">{shown}</p>
      <div className="erp-qr-scanner__actions">
        <CopyButton text={read.text} label={t('scanResult.copy')} />
        {content.kind === 'url' ? (
          <a className="btn btn-secondary" href={content.href} target="_blank" rel="noopener noreferrer">
            <Icon name="box-arrow-up-right" className="me-2" />{t('camera.openLink')}
          </a>
        ) : null}
      </div>
      <Button variant="link" className="erp-qr-scanner__resume" onClick={onResume}>{t('camera.scanNext')}</Button>
    </div>
  )
}
