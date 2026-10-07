import { useTranslation } from 'react-i18next'
import { HOLIDAY_LAYERS, type HolidayLayer } from '../utils/vietnam-holidays'

interface Props { layers: HolidayLayer[]; onToggle: (id: HolidayLayer) => void }

export function HolidayLayerToggles({ layers, onToggle }: Props) {
  const { t } = useTranslation('vietnam')
  return <div className="cn-cal-layers" role="group" aria-label={t('calendar.layersAria')}>
    {HOLIDAY_LAYERS.map((layer) => {
      const active = layers.includes(layer.id)
      return <button key={layer.id} type="button" className={`cn-cal-layer cn-cal-layer--${layer.id}`} aria-pressed={active} onClick={() => onToggle(layer.id)}>
        <span className="cn-cal-swatch" aria-hidden="true" />{t(`holidayLayers.${layer.id}`)}
      </button>
    })}
  </div>
}
