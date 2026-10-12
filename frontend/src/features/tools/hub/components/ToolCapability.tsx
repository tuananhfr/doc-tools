import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { ToolDevice, ToolOffline } from '../types/tool.types'
import { deviceNeedKeys, offlineNoticeKey } from '../utils/tool-device'

const OFFLINE_ICON: Record<ToolOffline, string> = { yes: 'cloud-check', 'after-first-use': 'cloud-download', no: 'wifi' }
const NEED_ICON = { camera: 'camera', mic: 'mic' } as const

/** Dòng năng lực dưới tiêu đề: chữ + icon (không chỉ màu), và báo trung thực khi mất mạng. */
export function ToolCapability({ device }: { device: ToolDevice }) {
  const { t } = useTranslation('common')
  const notice = offlineNoticeKey(device, useOnlineStatus())
  return (
    <>
      <ul className="cn-tool-capability" aria-label={t('tool.device.label')}>
        <li data-offline={device.offline}><Icon name={OFFLINE_ICON[device.offline]} />{t(`tool.device.offline.${device.offline}`)}</li>
        {deviceNeedKeys(device).map((need) => (
          <li key={need} data-need={need}><Icon name={NEED_ICON[need]} />{t(`tool.device.needs.${need}`)}</li>
        ))}
      </ul>
      {notice ? (
        <p className="cn-tool-offline-notice" role="status" data-offline-notice={notice}>
          <Icon name={notice === 'online' ? 'wifi' : 'wifi-off'} />
          <span>{notice === 'online' ? t('tool.device.backOnline') : t(`tool.device.notice.${notice}`)}</span>
        </p>
      ) : null}
    </>
  )
}
