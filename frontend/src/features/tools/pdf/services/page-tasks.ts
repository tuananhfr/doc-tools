import type { FlowNote, FlowTask } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import { newId } from '@/utils/id'
import type { QuickItem } from '../hooks/useQuickSources'
import type { Decorations, ImageStamp } from '../types/decorations.types'
import { DEFAULT_PDF_OUTPUT, type PageRef } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import { resolveDecorations } from '../utils/decorations'
import { baseName } from '../utils/file-guard'
import type { Point } from '../utils/page-geometry'
import { buildPdf } from './doc-build'
import { carryoverNotes, contextOf, firstName, output } from './quick-tasks'

/**
 * Việc của các công cụ nhanh làm trên TỪNG TRANG: sắp xếp, đánh số, đóng dấu,
 * che thông tin. Cùng engine với trình chỉnh sửa (`doc-build`) — công cụ nhanh
 * chỉ là một đường vào hẹp hơn tới đúng những phép đó.
 */

/** Dựng tệp theo thứ tự + góc xoay người dùng đã sắp; trang bị bỏ không có trong `pages`. */
export function organizeTask(items: QuickItem[], pages: PageRef[]): FlowTask {
  return async (step) => {
    const total = items.reduce((sum, item) => sum + item.pages.length, 0)
    const name = `${firstName(items)} - ${translate(items.length === 1 ? 'pdf:file.sorted' : 'pdf:file.mergedSorted')}`
    const built = await buildPdf(contextOf(items), pages, name, DEFAULT_PDF_OUTPUT, step)
    const notes: FlowNote[] = []
    if (pages.length < total) notes.push({ tone: 'info', text: translate('pdf:quickTask.removedPages', { count: total - pages.length }) })
    return {
      title: translate('pdf:quickTask.pdfPages', { count: pages.length }),
      output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })),
      notes: [...notes, ...carryoverNotes(built.carryover)],
    }
  }
}

export interface DecorateCopy {
  /** Đuôi tên tệp ra, đã dịch: "đã đánh số". */
  suffix: string
  /** Tiêu đề màn kết quả. */
  title: string
}

/** Số trang / dấu chữ / dấu ảnh lên MỘT tệp PDF. */
export function decorateTask(item: QuickItem, decorations: Decorations, copy: DecorateCopy): FlowTask {
  return async (step) => {
    const resolved = resolveDecorations(
      decorations,
      item.pages.map((page) => page.id),
    )
    const invalid = resolved.errors.headerFooter ?? resolved.errors.watermark ?? resolved.errors.imageStamp
    if (invalid) throw new Error(invalid)

    const stamped = new Set([...(resolved.headerFooter?.pageIds ?? []), ...(resolved.watermark?.pageIds ?? []), ...(resolved.imageStamp?.pageIds ?? [])])
    // Phạm vi hợp lệ mà không trúng trang nào (bỏ trang đầu của tệp 1 trang): tệp ra sẽ y hệt tệp gốc.
    if (stamped.size === 0) throw new Error(translate('pdf:quickTask.scopeNoPages'))

    const built = await buildPdf({ ...contextOf([item]), decorations: resolved }, item.pages, `${baseName(item.source.name)} - ${copy.suffix}`, DEFAULT_PDF_OUTPUT, step)
    const notes: FlowNote[] = []
    if (stamped.size < item.pages.length) notes.push({ tone: 'info', text: translate('pdf:quickTask.appliedTo', { stamped: stamped.size, total: item.pages.length }) })
    return { title: copy.title, output: output(built.file, translate('pdf:stage.pageCount', { count: item.pages.length })), notes: [...notes, ...carryoverNotes(built.carryover)] }
  }
}

/** Vẽ ảnh chữ ký vào các chỗ đã đặt. `spots`: id trang → tâm từng chữ ký (tỉ lệ trang nhìn thấy). */
export function signTask(item: QuickItem, image: Pick<ImageStamp, 'bytes' | 'mime' | 'aspect' | 'widthRatio'>, spots: Readonly<Record<string, readonly Point[]>>): FlowTask {
  return async (step) => {
    const imageStamp: ImageStamp = { ...image, anchor: 'center', margin: 0, opacity: 1, scope: { mode: 'all', range: '' }, spots }
    const resolved = resolveDecorations(
      { headerFooter: null, watermark: null, imageStamp },
      item.pages.map((page) => page.id),
    )
    const signed = resolved.imageStamp?.pageIds.size ?? 0
    if (signed === 0) throw new Error(translate('pdf:quickTask.noSignature'))

    const built = await buildPdf({ ...contextOf([item]), decorations: resolved }, item.pages, `${baseName(item.source.name)} - ${translate('pdf:file.signed')}`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: translate('pdf:quickTask.signed', { count: signed }),
      output: output(built.file, translate('pdf:stage.pageCount', { count: item.pages.length })),
      notes: [
        { tone: 'info', text: translate('pdf:quickTask.signNote') },
        ...carryoverNotes(built.carryover),
      ],
    }
  }
}

/**
 * Xoá thật vùng đã khoanh. `boxes`: id trang → khung trên trang (pt, gốc trên-trái,
 * y xuống). Trang có khung được dựng lại thành ảnh nên chữ, hình, form dưới
 * khung không còn trong tệp ra — phủ một hình đen lên nội dung gốc thì chép ra được.
 */
export function redactTask(item: QuickItem, boxes: Readonly<Record<string, Rect[]>>): FlowTask {
  return async (step) => {
    const pages = item.pages.map((page): PageRef => {
      const marked = boxes[page.id] ?? []
      return marked.length > 0 ? { ...page, markups: marked.map((box) => ({ id: newId(), kind: 'redact', box })) } : page
    })
    const redacted = pages.filter((page) => page.markups?.length).length
    if (redacted === 0) throw new Error(translate('pdf:quickTask.noRedaction'))

    const built = await buildPdf(contextOf([item]), pages, `${baseName(item.source.name)} - ${translate('pdf:file.redacted')}`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: translate('pdf:quickTask.redacted', { count: redacted }),
      output: output(built.file, translate('pdf:stage.pageCount', { count: pages.length })),
      notes: [
        { tone: 'success', text: translate('pdf:quickTask.redactRemoved') },
        { tone: 'info', text: translate('pdf:quickTask.redactRebuilt', { count: redacted }) },
        { tone: 'warning', text: translate('pdf:quickTask.redactReview') },
        ...carryoverNotes(built.carryover),
      ],
    }
  }
}
