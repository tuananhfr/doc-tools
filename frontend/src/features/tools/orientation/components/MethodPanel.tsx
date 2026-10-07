import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { ToolPanel, ToolSegments, type ToolSegment } from '@/features/tools/hub'
import { formatDeg } from '../utils/azimuth'
import type { OrientationAction, OrientationMethod, OrientationState } from '../utils/orientation-state'
import { DeviceCompassPanel } from './DeviceCompassPanel'
import { ManualDegree } from './ManualDegree'

interface MethodPanelProps {
  state: OrientationState
  hasImage: boolean
  disabled: boolean
  /** Tên đối tượng mà số độ sẽ gắn vào. */
  anchorLabel: string
  dispatch: (action: OrientationAction) => void
}

/** Bước 2 (spec v1.1 §3): đo ngay / tôi biết số độ / chỉ trên ảnh. */
export function MethodPanel({ state, hasImage, disabled, anchorLabel, dispatch }: MethodPanelProps) {
  const { t } = useTranslation('orientation')
  const options: ToolSegment<OrientationMethod>[] = [
    { value: 'DEVICE', label: t('method.options.DEVICE'), icon: 'phone' },
    { value: 'MANUAL', label: t('method.options.MANUAL'), icon: '123' },
    ...(hasImage ? [{ value: 'DRAWING' as const, label: t('method.options.DRAWING'), icon: 'map' }] : []),
  ]
  const anchor = state.anchor && state.anchor.source !== 'DRAWING' ? state.anchor : null
  // Không ảnh: mỗi đối tượng một số riêng — ô nhập và dòng "đã chốt" đi theo đối tượng đang chọn.
  const known = anchor && (hasImage || anchor.targetId === state.activeId) ? anchor : null

  return (
    <ToolPanel title={t('method.title')}>
      <ToolSegments label={t('method.label')} value={state.method} options={options} disabled={disabled} onChange={(method) => dispatch({ type: 'method', method })} />

      {state.method === 'DEVICE' ? (
        <>
          <DeviceCompassPanel
            targetLabel={anchorLabel}
            disabled={disabled}
            onLock={(azimuth, accuracy) => dispatch({ type: 'known-azimuth', azimuth, source: 'DEVICE', accuracy })}
            onManual={() => dispatch({ type: 'method', method: 'MANUAL' })}
          />
          {known?.source === 'DEVICE' ? (
            <p className="erp-orient-note erp-orient-note--success" role="status">
              <Icon name="check-circle" />
              {t('method.locked', { degree: formatDeg(known.azimuth), target: anchorLabel.toLowerCase() })}
            </p>
          ) : null}
        </>
      ) : null}

      {state.method === 'MANUAL' ? (
        <ManualDegree
          key={hasImage ? (known?.targetId ?? 'none') : state.activeId}
          label={anchorLabel}
          value={known?.source === 'MANUAL' ? known.azimuth : null}
          disabled={disabled}
          onChange={(azimuth) => dispatch({ type: 'known-azimuth', azimuth, source: 'MANUAL' })}
        />
      ) : null}

      {state.method === 'DRAWING' ? (
        <p className="erp-orient-note">
          <Icon name="info-circle" />
          {t('method.drawingNote')}
        </p>
      ) : null}
    </ToolPanel>
  )
}
