import { useEffect, useState } from 'react'
import { withBase } from '@/utils/url'
import type { ImageItem } from '../types/image.types'
import { intakeImage } from '../services/image-intake'

/** Editable example, separate from user uploads so opening a tool never scrolls or replaces a file. */
export function useSamplePhoto(path: string) {
  const [item, setItem] = useState<ImageItem | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    let active = true, loaded: ImageItem | null = null
    const release = (image: ImageItem) => { URL.revokeObjectURL(image.url); if (image.thumbnail) URL.revokeObjectURL(image.thumbnail) }
    void (async () => {
      const response = await fetch(withBase(path), { signal: controller.signal })
      if (!response.ok) throw new Error('SAMPLE_LOAD')
      const result = await intakeImage(new File([await response.blob()], 'portrait-demo.png', { type: 'image/png' }))
      if (!result.ok) throw new Error('SAMPLE_LOAD')
      if (!active) { release(result.item); return }
      loaded = result.item; setItem(result.item)
    })().catch(() => { if (active) setItem(null) })
    return () => { active = false; controller.abort(); if (loaded) release(loaded) }
  }, [path])
  return item
}
