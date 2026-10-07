import type { FlowNote, FlowOutput, FlowStep, FlowTask } from '@/features/tools/hub'
import { createZipWriter, stem } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import { formatFileSize } from '@/utils/format'
import type { ImageFormat, ImageItem, Size } from '../types/image.types'
import { fitWithin, IMAGE_FORMAT, outputName, sizeLabel } from '../utils/image-format'
import { createCanvas, decodeImage, encodeCanvas, releaseCanvas, writableFormat } from './image-codec'
import { carryExif, exifNotes, originalExif, type ExifOutcome } from './image-exif'

/**
 * Việc làm trên CẢ LÔ ảnh: đổi định dạng và nén (ở đây), đổi cỡ + đổi tên
 * (`batch-tasks.ts` dùng lại `reencode` / `eachImage` / `bundle`). Mỗi ảnh được giải mã, vẽ
 * lại lên canvas rồi mã hoá — từng ảnh một, đóng bitmap ngay, để 50 ảnh 12 MP
 * không cùng nằm trong RAM.
 */

interface Encoded {
  name: string
  blob: Blob
}

interface Redrawn {
  blob: Blob
  exif: ExifOutcome
}

/** Vẽ lại một ảnh ở kích thước `resize` trả về rồi mã hoá. JPG không có nền trong suốt nên tô trắng trước. */
export async function reencode(item: ImageItem, format: ImageFormat, quality: number, resize: (size: Size) => Size): Promise<Redrawn> {
  const bitmap = await decodeImage(item.file)
  try {
    const { canvas, context } = createCanvas(resize(bitmap))
    try {
      if (format === 'jpeg') {
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      return await carryExif(item, await encodeCanvas(canvas, format, quality), format, canvas)
    } finally {
      releaseCanvas(canvas)
    }
  } finally {
    bitmap.close()
  }
}

export type ProgressVerb = 'process' | 'convert' | 'compress'

export async function eachImage(items: ImageItem[], step: FlowStep, verb: ProgressVerb, work: (item: ImageItem) => Promise<Redrawn>): Promise<Redrawn[]> {
  const blobs: Redrawn[] = []
  for (const [index, item] of items.entries()) {
    step.signal.throwIfAborted()
    step.onProgress(index, items.length, items.length > 1 ? translate(`image:tasks.progress.${verb}`, { current: index + 1, total: items.length }) : undefined)
    try {
      blobs.push(await work(item))
    } catch (error) {
      // Lô nhiều ảnh: nói rõ ảnh nào hỏng, không thì người dùng phải thử từng tệp.
      const reason = error instanceof Error ? error.message : translate('image:tasks.imageFailed')
      throw new Error(items.length > 1 ? `"${item.name}": ${reason}` : reason, { cause: error })
    }
  }
  step.signal.throwIfAborted()
  step.onProgress(items.length, items.length)
  return blobs
}

/** Một ảnh thì trả thẳng ảnh; nhiều ảnh thì gói .zip — gói một tệp chỉ bắt người dùng giải nén thừa. */
export async function bundle(files: Encoded[], zipName: string): Promise<FlowOutput> {
  if (files.length === 1) return { name: files[0].name, blob: files[0].blob }
  const zip = createZipWriter()
  for (const file of files) zip.add(file.name, new Uint8Array(await file.blob.arrayBuffer()))
  return { name: `${zipName}.zip`, blob: zip.finish(), detail: translate('image:shared.imageCount', { count: files.length }) }
}

export interface ConvertOptions {
  format: ImageFormat
  /** 0–1, chỉ dùng khi ra JPG / WebP. */
  quality: number
}

/** Đổi cả lô sang một định dạng. Ảnh đã đúng định dạng thì giữ nguyên từng byte, không mã hoá lại cho xấu đi. */
export function convertImagesTask(items: ImageItem[], { format, quality }: ConvertOptions): FlowTask {
  return async (step) => {
    const label = IMAGE_FORMAT[format].label
    const results = await eachImage(items, step, 'convert', async (item) => (item.format === format ? { blob: item.file, exif: await originalExif(item) } : reencode(item, format, quality, (size) => size)))
    const files = items.map((item, index) => ({ name: outputName(item.name, format), blob: results[index].blob }))

    const kept = items.filter((item) => item.format === format).length
    const flattened = format === 'jpeg' && items.some((item) => item.format !== 'jpeg')
    const notes: FlowNote[] = []
    if (kept > 0) notes.push({ tone: 'info', text: translate('image:convert.keptNote', { count: kept, format: label }) })
    if (flattened) notes.push({ tone: 'info', text: translate('image:tasks.jpegFlatten') })
    notes.push(...exifNotes(results.map((result) => result.exif)))

    const output = await bundle(files, `${stem(items[0].name)} - ${translate('image:file.convertedCount', { count: items.length, format: label })}`)
    return {
      title: items.length === 1 ? translate('image:convert.titleOne', { format: label }) : translate('image:convert.titleMany', { count: items.length, format: label }),
      output: items.length === 1 ? { ...output, detail: sizeLabel(items[0]) } : output,
      notes,
    }
  }
}

export interface CompressOptions {
  /** 0–1 cho JPG / WebP. */
  quality: number
  /** Cạnh dài tối đa (px); null = giữ kích thước. */
  maxEdge: number | null
}

/**
 * Nén cả lô, giữ định dạng của từng ảnh. Ảnh nào ra KHÔNG nhẹ hơn thì trả lại
 * tệp gốc: một công cụ nén đưa về tệp nặng hơn là công cụ nói dối.
 */
export function compressImagesTask(items: ImageItem[], { quality, maxEdge }: CompressOptions): FlowTask {
  return async (step) => {
    const results = await eachImage(items, step, 'compress', (item) => reencode(item, writableFormat(item.format), quality, (size) => fitWithin(size, maxEdge)))
    const blobs = results.map((result) => result.blob)

    // Ảnh nào thật sự được thay bằng bản nén (bản nén nhẹ hơn tệp gốc).
    const replaced = items.map((item, index) => blobs[index].size < item.size)
    // Ảnh giữ nguyên tệp gốc thì EXIF (nếu có) vẫn còn, bất kể bản nén có mang được hay không.
    const exif = results.map((result, index): ExifOutcome => (replaced[index] || result.exif === 'none' ? result.exif : 'kept'))
    const files = items.map((item, index) =>
      replaced[index] ? { name: outputName(item.name, writableFormat(item.format), translate('image:file.compressed')), blob: blobs[index] } : { name: item.name, blob: item.file as Blob },
    )
    const changed = items.filter((_, index) => replaced[index])
    const unchanged = items.length - changed.length
    const shrunk = maxEdge ? changed.filter((item) => Math.max(item.width, item.height) > maxEdge).length : 0

    const before = items.reduce((sum, item) => sum + item.size, 0)
    const after = files.reduce((sum, file) => sum + file.blob.size, 0)
    const smaller = after < before
    const sizes = `${formatFileSize(before)} → ${formatFileSize(after)}`
    const notes: FlowNote[] = []

    if (smaller) notes.push({ tone: 'success', text: translate('image:compress.smaller', { sizes, percent: Math.round((1 - after / before) * 100) }) })
    if (unchanged > 0) {
      const hint = hintFor(items, maxEdge)
      notes.push({ tone: 'warning', text: items.length === 1 ? translate('image:compress.unchangedOne', { hint }) : translate('image:compress.unchangedSome', { count: unchanged, total: items.length, hint }) })
    }
    if (shrunk > 0) notes.push({ tone: 'info', text: translate('image:compress.shrunk', { count: shrunk, edge: maxEdge }) })
    notes.push(...exifNotes(exif))
    if (changed.some((item) => item.format === 'webp') && writableFormat('webp') !== 'webp') {
      notes.push({ tone: 'info', text: translate('image:tasks.webpAsPng') })
    }

    const output = await bundle(files, `${stem(items[0].name)} - ${translate('image:file.compressedCount', { count: items.length })}`)
    return {
      title: smaller ? translate('image:compress.titleDone') : translate('image:compress.titleNone'),
      tone: smaller ? 'success' : 'warning',
      output: items.length === 1 ? { ...output, detail: sizeLabel(replaced[0] ? fitWithin(items[0], maxEdge) : items[0]) } : output,
      notes,
    }
  }
}

function hintFor(items: ImageItem[], maxEdge: number | null): string {
  if (items.some((item) => item.format === 'png')) {
    return translate('image:compress.hintPng')
  }
  return maxEdge ? translate('image:compress.hintMaxed') : translate('image:compress.hintTryEdge')
}
