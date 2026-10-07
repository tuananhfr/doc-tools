import { canvasToBlob } from '@/features/tools/shared'
import { translate } from '@/i18n/runtime'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { isDefaultSheet, sheetKey } from '../utils/image-sheet'
import { sheetLayoutOf } from './page-size'
import { openPdf, renderPdfPage } from './pdf-render'
import { renderSheet } from './pdf-to-image'

const THUMB_WIDTH = 240
/** Vẽ song song quá nhiều trang là giật cả tab khi thả tệp 300 trang. */
const MAX_CONCURRENT = 3

const thumbnails = new Map<string, Promise<string>>()

let running = 0
const waiting: Array<() => void> = []

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve))
  running++
  try {
    return await task()
  } finally {
    running--
    waiting.shift()?.()
  }
}

async function canvasUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8).catch(() => null)
  if (!blob) throw new Error(translate('pdf:errors.drawPage'))
  return URL.createObjectURL(blob)
}

/**
 * URL ảnh thu nhỏ của một trang (chưa áp xoay thêm — thẻ trang tự xoay bằng
 * CSS). Ảnh để khổ mặc định dùng thẳng tệp ảnh: `object-fit: contain` trên
 * tờ A4 đã đúng bố cục; có lề / khổ khác / gộp ảnh thì phải vẽ cả tờ.
 */
export function thumbnailUrl(source: SourceFile, page: Pick<PageRef, 'pageIndex' | 'sheet'>): Promise<string> {
  const key = source.kind === 'pdf' ? `${source.id}:${page.pageIndex}` : `${source.id}:${sheetKey(page.sheet)}`
  let url = thumbnails.get(key)
  if (url) return url

  if (source.kind === 'image' && isDefaultSheet(page.sheet)) {
    url = Promise.resolve(URL.createObjectURL(new Blob([source.bytes], { type: source.mime })))
  } else if (source.kind === 'pdf') {
    url = withSlot(async () => {
      const pdfPage = await (await openPdf(source)).getPage(page.pageIndex + 1)
      const scale = THUMB_WIDTH / pdfPage.getViewport({ scale: 1 }).width
      return canvasUrl(await renderPdfPage(source, page.pageIndex, { scale }))
    })
  } else {
    url = withSlot(async () => {
      const { size } = await sheetLayoutOf(source, page.sheet)
      return canvasUrl(await renderSheet(source, page.sheet, 0, THUMB_WIDTH / size.width))
    })
  }

  // Lỗi thì bỏ khỏi cache để lần cuộn sau thử lại, không kẹt mãi ảnh hỏng.
  url.catch(() => thumbnails.delete(key))
  thumbnails.set(key, url)
  return url
}

export function releaseThumbnails(): void {
  for (const url of thumbnails.values()) void url.then((value) => URL.revokeObjectURL(value), () => undefined)
  thumbnails.clear()
}
