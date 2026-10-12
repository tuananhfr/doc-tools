import { useEffect, useRef, useState } from 'react'
import type { GraphicJob, GraphicTemplate } from '../types/graphic.types'
import { renderTemplateThumbnail } from '../services/graphic-thumbnails'
import { fileKey } from '../utils/file-identity'

const DELAY_MS = 400

/**
 * URL thumbnail theo id mẫu. Vẽ lần lượt từng mẫu (không song song — mỗi lượt giữ một canvas), sau khi
 * người dùng ngừng gõ 400 ms. Thumbnail cũ giữ nguyên tới khi bản mới xong để lưới không nháy trống;
 * mẫu vẽ lỗi (chữ không vừa, ảnh hỏng) thì bỏ ảnh → picker chỉ hiện tên.
 */
export function useTemplateThumbnails(job: Omit<GraphicJob, 'template'>, templates: readonly GraphicTemplate[], enabled: boolean): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const live = useRef<Record<string, string>>({})
  const signature = JSON.stringify([templates.map(template => template.id), job.brand, job.files.map(fileKey), job.logo ? fileKey(job.logo) : null])

  useEffect(() => () => { for (const url of Object.values(live.current)) URL.revokeObjectURL(url) }, [])

  useEffect(() => {
    if (!enabled) return
    const abort = new AbortController()
    const replace = (id: string, url: string | null) => {
      const old = live.current[id]
      const next = { ...live.current }
      if (url) next[id] = url
      else delete next[id]
      live.current = next
      if (old && old !== url) URL.revokeObjectURL(old)
      setUrls(next)
    }
    const timer = window.setTimeout(async () => {
      for (const template of templates) {
        let url: string | null = null
        try {
          url = URL.createObjectURL(await renderTemplateThumbnail(job, template, abort.signal))
        } catch {
          if (abort.signal.aborted) return
        }
        if (abort.signal.aborted) { if (url) URL.revokeObjectURL(url); return }
        replace(template.id, url)
      }
    }, DELAY_MS)
    return () => { abort.abort(); window.clearTimeout(timer) }
    // `signature` gói đủ job + danh sách mẫu; đưa thẳng object vào deps là vẽ lại mỗi lần render.
  }, [signature, enabled])

  return urls
}
