import type { FlowNote, FlowTask } from '@/features/tools/hub'
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
    const name = items.length === 1 ? `${firstName(items)} - đã sắp xếp` : `${firstName(items)} - đã ghép và sắp xếp`
    const built = await buildPdf(contextOf(items), pages, name, DEFAULT_PDF_OUTPUT, step)
    const notes: FlowNote[] = []
    if (pages.length < total) notes.push({ tone: 'info', text: `Đã bỏ ${total - pages.length} trang so với tệp gốc. Tệp gốc trên máy bạn không bị đụng tới.` })
    return {
      title: `Đã tạo PDF ${pages.length} trang`,
      output: output(built.file, `${pages.length} trang`),
      notes: [...notes, ...carryoverNotes(built.carryover)],
    }
  }
}

export interface DecorateCopy {
  /** Đuôi tên tệp ra: "đã đánh số". */
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
    if (stamped.size === 0) throw new Error('phạm vi đã chọn không có trang nào.')

    const built = await buildPdf({ ...contextOf([item]), decorations: resolved }, item.pages, `${baseName(item.source.name)} - ${copy.suffix}`, DEFAULT_PDF_OUTPUT, step)
    const notes: FlowNote[] = []
    if (stamped.size < item.pages.length) notes.push({ tone: 'info', text: `Áp lên ${stamped.size}/${item.pages.length} trang theo phạm vi đã chọn.` })
    return { title: copy.title, output: output(built.file, `${item.pages.length} trang`), notes: [...notes, ...carryoverNotes(built.carryover)] }
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
    if (signed === 0) throw new Error('chưa đặt chữ ký lên trang nào.')

    const built = await buildPdf({ ...contextOf([item]), decorations: resolved }, item.pages, `${baseName(item.source.name)} - đã chèn chữ ký`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: `Đã chèn chữ ký vào ${signed} trang`,
      output: output(built.file, `${item.pages.length} trang`),
      notes: [
        { tone: 'info', text: 'Đây là HÌNH chữ ký vẽ đè lên trang, không phải chữ ký số: tệp không mang chứng thư và không tự chứng minh được ai đã ký.' },
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
    if (redacted === 0) throw new Error('chưa có khung che nào.')

    const built = await buildPdf(contextOf([item]), pages, `${baseName(item.source.name)} - đã che`, DEFAULT_PDF_OUTPUT, step)
    return {
      title: `Đã che thông tin trên ${redacted} trang`,
      output: output(built.file, `${pages.length} trang`),
      notes: [
        { tone: 'success', text: 'Nội dung dưới khung đã bị XOÁ khỏi tệp, không chỉ che: bôi đen, tìm kiếm hay chép chữ đều không ra.' },
        { tone: 'info', text: `${redacted} trang có khung che được dựng lại thành ảnh 200 DPI — chữ ngoài khung vẫn tìm và chép được, nhưng liên kết, ô nhập liệu trên các trang đó không còn.` },
        { tone: 'warning', text: 'Mở tệp ra xem lại từng trang trước khi gửi đi — công cụ chỉ xoá đúng vùng bạn đã khoanh.' },
        ...carryoverNotes(built.carryover),
      ],
    }
  }
}
