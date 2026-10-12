import { createCanvas, encodeCanvas, releaseCanvas } from '@/features/tools/image/services/image-codec'
import type { GraphicJob, GraphicTemplate } from '../types/graphic.types'
import { THUMBNAIL_DPI, THUMBNAIL_SOURCE_EDGE, fitWithin, thumbnailJob } from '../utils/graphic-thumbnail-job'
import { checkedImage, renderGraphicSheet } from './graphic-render'

const proxies = new WeakMap<File, Promise<File>>()

/**
 * Bản thu nhỏ PNG (giữ nền trong suốt) của ảnh người dùng, chỉ để vẽ thumbnail. Đi qua `checkedImage` như
 * bản xem trước — ảnh vượt trần bị chặn từ header, không được giải mã ở đây.
 */
function proxyOf(file: File): Promise<File> {
  let proxy = proxies.get(file)
  if (!proxy) {
    proxy = (async () => {
      const image = await checkedImage(file)
      try {
        const size = fitWithin(image, THUMBNAIL_SOURCE_EDGE), frame = createCanvas(size)
        try {
          frame.context.drawImage(image, 0, 0, size.width, size.height)
          return new File([await encodeCanvas(frame.canvas, 'png')], file.name, { type: 'image/png' })
        } finally { releaseCanvas(frame.canvas) }
      } finally { image.close() }
    })()
    // Lỗi không được nhớ: ảnh hỏng thì lần sau vẫn thử lại (vd. người dùng thay ảnh khác cùng đối tượng File thì không, nhưng giải mã có thể lỗi tạm do thiếu RAM).
    proxy.catch(() => proxies.delete(file))
    proxies.set(file, proxy)
  }
  return proxy
}

/** Thumbnail của một mẫu = chính `renderGraphicSheet` ở 30 DPI trên ảnh proxy — không vẽ tay ảnh tĩnh. */
export async function renderTemplateThumbnail(job: Omit<GraphicJob, 'template'>, template: GraphicTemplate, signal?: AbortSignal): Promise<Blob> {
  const base = thumbnailJob(job, template)
  const files = await Promise.all(base.files.map(proxyOf))
  const logo = base.logo ? await proxyOf(base.logo) : null
  signal?.throwIfAborted()
  return renderGraphicSheet({ ...base, files, logo }, files, THUMBNAIL_DPI, 'png', signal)
}
