import type { FlowNote, FlowTask } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
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
    const reading = translate('pdf:compareTask.reading')
    const tick = () => step.onProgress(++done, total, reading)
    const old = await linesOf(before, tick, step.signal)
    const next = await linesOf(after, tick, step.signal)

    // Không có chữ để so thì "không khác nhau" là câu trả lời SAI — hai bản scan khác hẳn nhau cũng ra như vậy.
    for (const [item, text] of [
      [before, old],
      [after, next],
    ] as const) {
      if (text.lines.length === 0) throw new Error(translate('pdf:compareTask.noText', { name: item.source.name }))
    }

    const result = compareLines(old.lines, next.lines, options)
    step.signal.throwIfAborted()
    const report = formatComparison(result, { before: translate('pdf:file.report.document', { name: before.source.name, count: before.pages.length }), after: translate('pdf:file.report.document', { name: after.source.name, count: after.pages.length }) })
    const same = result.hunks.length === 0

    const notes: FlowNote[] = []
    if (!result.exact) notes.push({ tone: 'warning', text: translate('pdf:compareTask.tooDifferent') })
    if (old.blank + next.blank > 0) notes.push({ tone: 'warning', text: translate('pdf:compareTask.blankPages', { count: old.blank + next.blank }) })
    notes.push({ tone: 'info', text: translate('pdf:compareTask.scopeNote') })

    return {
      title: same ? translate('pdf:compareTask.same') : translate('pdf:compareTask.found', { count: result.hunks.length }),
      tone: same ? 'success' : 'info',
      output: {
        name: `${baseName(before.source.name)} - ${translate('pdf:file.compare')}.txt`,
        blob: new Blob([report], { type: 'text/plain;charset=utf-8' }),
        detail: same ? translate('pdf:compareTask.report') : translate('pdf:compareTask.diffDetail', { removed: result.removed, added: result.added }),
      },
      notes,
      text: report,
      textLabel: translate('pdf:compareTask.report'),
    }
  }
}
