import { HOLIDAY_LAYERS, type HolidayLayer } from '../core/vietnam-holidays'

interface Props { layers: HolidayLayer[]; onToggle: (id: HolidayLayer) => void }

export function FamilyLayerToggles({ layers, onToggle }: Props) {
  return <div className="cn-family-layers" role="group" aria-label="Hiện ngày lễ trên lịch">
    {HOLIDAY_LAYERS.map((layer) => {
      const active = layers.includes(layer.id)
      return <button key={layer.id} type="button" className={`cn-family-layer cn-family-layer--${layer.id}`} aria-pressed={active} onClick={() => onToggle(layer.id)}>
        <span className="cn-family-swatch" aria-hidden="true" />{layer.label}
      </button>
    })}
  </div>
}
