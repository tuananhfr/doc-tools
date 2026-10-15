import { useEffect, useState } from 'react'
import type { ImageItem } from '../types/image.types'
import type { CropState } from '../utils/crop-state'
import { renderCrop } from '../services/crop-render'
import { writableFormat } from '../services/image-codec'

/** Small result preview from the export renderer; the download keeps full resolution. */
export function useCropPreview(item: ImageItem | null, state: CropState | null) {
  const key = JSON.stringify([item?.id, state])
  const [preview, setPreview] = useState<{ key: string; url: string; failed: boolean } | null>(null)
  useEffect(() => {
    let stopped = false
    let url: string | null = null
    const timer = window.setTimeout(async () => {
      if (!item || !state) return
      try {
        const result = await renderCrop(item.file, state, writableFormat(item.format), 640)
        if (stopped) return
        url = URL.createObjectURL(result.blob)
        setPreview({ key, url, failed: false })
      } catch {
        if (!stopped) setPreview({ key, url: '', failed: true })
      }
    }, 120)
    return () => { stopped = true; window.clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
  }, [key])
  const current = preview?.key === key ? preview : null
  return { url: current?.url || null, failed: current?.failed ?? false, busy: !!item && !current }
}
