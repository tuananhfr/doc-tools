import { useCallback, useState } from 'react'
import { HOLIDAY_LAYERS, type HolidayLayer } from '../core/vietnam-holidays'

// Tuỳ chọn hiển thị của riêng trình duyệt này, không nằm trong bản sao lưu gia đình.
const STORAGE_KEY = 'chuyen-nho.family.holiday-layers'
const DEFAULT_LAYERS = HOLIDAY_LAYERS.filter((layer) => layer.defaultOn).map((layer) => layer.id)

function readLayers(): HolidayLayer[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(stored)) return HOLIDAY_LAYERS.map((layer) => layer.id).filter((id) => stored.includes(id))
  } catch { /* bộ nhớ bị chặn hoặc hỏng: dùng mặc định */ }
  return DEFAULT_LAYERS
}

export function useHolidayLayers() {
  const [layers, setLayers] = useState<HolidayLayer[]>(readLayers)
  const toggle = useCallback((id: HolidayLayer) => setLayers((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* vẫn giữ lựa chọn trong phiên này */ }
    return next
  }), [])
  return { layers, toggle }
}
