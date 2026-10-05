import type { FlowNote, FlowTask } from '@/features/tools/hub'
import { stem } from '@/features/tools/shared'
import { formatFileSize } from '@/utils/format'
import type { ImageFormat, ImageItem } from '../types/image.types'
import { renameAll, resizeTo, type RenameRule, type ResizeRule } from '../utils/batch'
import { IMAGE_FORMAT } from '../utils/image-format'
import { writableFormat } from './image-codec'
import { exifNotes, originalExif } from './image-exif'
import { bundle, eachImage, reencode } from './image-tasks'

export interface BatchOptions {
  resize: ResizeRule
  /** `keep` = mỗi ảnh giữ định dạng của nó. */
  format: ImageFormat | 'keep'
  /** 0–1 cho JPG / WebP. */
  quality: number
  rename: RenameRule
}

/**
 * Một lượt cho cả lô: đổi cỡ + đổi định dạng + đổi tên. Ảnh không cần đổi cỡ lẫn
 * định dạng được trả lại NGUYÊN tệp gốc (chỉ đổi tên) — mã hoá lại một tấm JPG
 * chỉ để đặt tên mới là làm nó xấu đi vô cớ.
 */
export function batchImagesTask(items: ImageItem[], { resize, format, quality, rename }: BatchOptions): FlowTask {
  return async (step) => {
    const targets = items.map((item) => (format === 'keep' ? writableFormat(item.format) : format))
    const untouched = items.map((item, index) => {
      const size = resizeTo(item, resize)
      return targets[index] === item.format && size.width === item.width && size.height === item.height
    })

    const results = await eachImage(items, step, 'Đang xử lý', async (item) => {
      const index = items.indexOf(item)
      if (untouched[index]) return { blob: item.file, exif: await originalExif(item) }
      return reencode(item, targets[index], quality, (size) => resizeTo(size, resize))
    })

    const names = renameAll(
      items.map((item) => item.name),
      targets.map((target) => IMAGE_FORMAT[target].extension),
      rename,
    )
    const files = results.map((result, index) => ({ name: names[index], blob: result.blob }))

    const resized = items.filter((item) => resizeTo(item, resize).width !== item.width).length
    const kept = untouched.filter(Boolean).length
    const before = items.reduce((sum, item) => sum + item.size, 0)
    const after = files.reduce((sum, file) => sum + file.blob.size, 0)

    const notes: FlowNote[] = [{ tone: 'info', text: `${formatFileSize(before)} → ${formatFileSize(after)}.` }]
    if (resize.mode !== 'keep') {
      notes.push({ tone: 'info', text: `${resized}/${items.length} ảnh được thu nhỏ.${resized < items.length ? ' Ảnh đã nhỏ hơn cỡ đích thì giữ nguyên cỡ — công cụ không phóng to.' : ''}` })
    }
    if (kept > 0) notes.push({ tone: 'info', text: `${kept} ảnh không cần đổi cỡ hay định dạng — giữ nguyên từng byte, chỉ đổi tên.` })
    if (format === 'jpeg' && items.some((item) => item.format !== 'jpeg')) notes.push({ tone: 'info', text: 'JPG không có nền trong suốt: vùng trong suốt (nếu có) được tô trắng.' })
    if (format === 'keep' && items.some((item, index) => targets[index] !== item.format)) notes.push({ tone: 'info', text: 'Trình duyệt này không ghi được WebP: ảnh WebP được lưu thành PNG.' })
    notes.push(...exifNotes(results.map((result) => result.exif)))

    return {
      title: items.length === 1 ? 'Đã xử lý ảnh' : `Đã xử lý ${items.length} ảnh`,
      output: await bundle(files, `${stem(names[0])} - ${items.length} ảnh`),
      notes,
    }
  }
}
