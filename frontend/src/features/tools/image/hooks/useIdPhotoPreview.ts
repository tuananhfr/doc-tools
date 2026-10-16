import { useEffect, useRef, useState } from 'react'
import type { PortraitAppearance } from '../services/portrait-appearance'
import { styledPortrait } from '../services/portrait-appearance'
import { BackgroundRemovalError } from '../services/ai-background-removal'
import type { BackgroundRemovalErrorCode } from '../types/background-removal.types'
import type { ImageItem, Rect, Size } from '../types/image.types'

/** Uses the export renderer for both the original crop and the edited portrait. */
export function useIdPhotoPreview(item: ImageItem | null, rect: Rect | null, photo: Size, appearance: PortraitAppearance) {
  const [preview, setPreview] = useState<{ key: string; url: string; failed: boolean; error: BackgroundRemovalErrorCode | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const blobIds = useRef(new WeakMap<Blob, number>())
  const nextBlobId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    const job = new AbortController()
    controller.current = job
    return () => { job.abort(); if (controller.current === job) controller.current = null }
  }, [item?.file])
  const shirt = appearance.shirtBlob
  if (shirt && !blobIds.current.has(shirt)) blobIds.current.set(shirt, ++nextBlobId.current)
  const key = JSON.stringify([item?.id, rect, photo.width, photo.height, { ...appearance, shirtBlob: shirt ? blobIds.current.get(shirt) : 0 }, attempt])
  useEffect(() => {
    let stopped = false
    let url: string | null = null
    const timer = window.setTimeout(async () => {
      if (!item || !rect) return
      try {
        const rendered = await styledPortrait(item.file, rect, photo, appearance, 640, controller.current?.signal)
        if (stopped) return
        url = URL.createObjectURL(rendered.blob)
        setPreview({ key, url, failed: false, error: null })
      } catch (error) {
        if (!stopped) setPreview({ key, url: '', failed: true, error: error instanceof BackgroundRemovalError ? error.code : null })
      }
    }, 150)
    return () => { stopped = true; window.clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
  }, [key, appearance.shirtBlob])
  const current = preview?.key === key ? preview : null
  return { url: current?.url || null, failed: current?.failed ?? false, error: current?.error ?? null, busy: !!item && !current, retry: () => setAttempt(value => value + 1) }
}
