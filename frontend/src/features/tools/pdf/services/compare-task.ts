import type { FlowNote, FlowTask } from '@/features/tools/hub'
import type { QuickItem } from '../hooks/useQuickSources'
import { baseName } from '../utils/file-guard'
import { plainText } from '../utils/plain-text'
import { compareLines, formatComparison, type CompareOptions, type DocLine } from '../utils/text-diff'
import { loadPageText } from './text-layer'

interface DocText {
  lines: DocLine[]
  /** Số trang không có lớp chữ (trang scan, trang chỉ có hình). */
  blank: number
}

async function linesOf(item: QuickItem, tick: () => void, signal: AbortSignal): Promise<DocText> {
  const lines: DocLine[] = []
  let blank = 0
  for (const [index, page] of item.pages.entries()) {
    signal.throwIfAborted()
    const text = plainText(await loadPageText(item.source, page))
    const found = text.split('\n').filter((line) => line.trim() !== '')
    if (found.length === 0) blank++
    for (const line of found) lines.push({ text: line, page: index + 1 })
    tick()
  }
  return { lines, blank }
}

/**
 * So CHỮ của hai tệp PDF theo từng dòng — xác định, không AI. Tệp ra là báo cáo
 * dạng chữ; màn kết quả hiện luôn nội dung đó.
 */
export function compareTask(before: QuickItem, after: QuickItem, options: CompareOptions): FlowTask {
  return async (step) => {
    const total = before.pages.length + after.pages.length
    let done = 0
    const tick = () => step.onProgress(++done, total, 'Đang đọc chữ')
    const old = await linesOf(before, tick, step.signal)
    const next = await linesOf(after, tick, step.signal)

    // Không có chữ để so thì "không khác nhau" là câu trả lời SAI — hai bản scan khác hẳn nhau cũng ra như vậy.
    for (const [item, text] of [
      [before, old],
      [after, next],
    ] as const) {
      if (text.lines.length === 0) throw new Error(`tệp "${item.source.name}" không có lớp chữ (tệp scan). Chạy "Nhận dạng chữ (OCR)" cho tệp đó trước rồi so lại.`)
    }

    const result = compareLines(old.lines, next.lines, options)
    step.signal.throwIfAborted()
    const report = formatComparison(result, { before: `${before.source.name} (${before.pages.length} trang)`, after: `${after.source.name} (${after.pages.length} trang)` })
    const same = result.hunks.length === 0

    const notes: FlowNote[] = []
    if (!result.exact) notes.push({ tone: 'warning', text: 'Hai bản khác nhau quá nhiều để dò từng dòng: phần giữa được báo là "bỏ hết rồi thêm hết". Kiểm tra lại xem có chọn đúng hai bản của cùng một tài liệu không.' })
    if (old.blank + next.blank > 0) notes.push({ tone: 'warning', text: `${old.blank + next.blank} trang không có lớp chữ (trang scan hoặc chỉ có hình) nên KHÔNG được so.` })
    notes.push({ tone: 'info', text: 'Chỉ so chữ theo từng dòng. Hình vẽ, chữ ký, con dấu, bảng dạng ảnh và định dạng (đậm, màu, cỡ chữ) không được so; một đoạn chỉ đổi chỗ ngắt dòng cũng hiện là khác.' })

    return {
      title: same ? 'Không thấy dòng chữ nào khác nhau' : `Tìm thấy ${result.hunks.length} chỗ khác`,
      tone: same ? 'success' : 'info',
      output: {
        name: `${baseName(before.source.name)} - so sánh.txt`,
        blob: new Blob([report], { type: 'text/plain;charset=utf-8' }),
        detail: same ? 'Báo cáo so sánh' : `bỏ ${result.removed} dòng · thêm ${result.added} dòng`,
      },
      notes,
      text: report,
      textLabel: 'Báo cáo so sánh',
    }
  }
}
