import { normalizeTextSearch } from '@/utils/text-search'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { toolProcessing } from '@/features/tools/hub/utils/tool-registry'
import { readyFirst } from './hub-tools'

export type ProcessingMode = 'device' | 'model' | 'server'
export type ProcessingFilter = ProcessingMode | 'all'

export const PROCESSING_LABEL: Record<ProcessingMode, string> = {
  device: 'Trên thiết bị',
  model: 'Trên thiết bị, có tải bộ nhận dạng',
  server: 'Cần máy chủ',
}

export const PROCESSING_FILTERS: readonly { value: ProcessingFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'device', label: PROCESSING_LABEL.device },
  { value: 'model', label: 'Có tải bộ nhận dạng' },
  { value: 'server', label: PROCESSING_LABEL.server },
]

export interface ProcessingRow {
  tool: ToolDefinition
  group: string
  mode: ProcessingMode
  note: string
}

const MODE_OF = { browser: 'device', 'browser-model': 'model', server: 'server' } as const

function defaultNote(tool: ToolDefinition, mode: ProcessingMode): string {
  if (mode === 'server') return 'Sắp có. Cần tra cứu dữ liệu trên máy chủ; sẽ ghi rõ dữ liệu gửi đi trước khi ra mắt.'
  if (mode === 'model') return 'Tải bộ nhận dạng một lần từ chính trang này, rồi nhận dạng ngay trên máy.'
  return tool.noFile ? 'Chạy ngay trên máy bạn, không gửi dữ liệu đi.' : 'Tệp không rời thiết bị.'
}

/** Một dòng / công cụ; ghi chú lấy `privacyNote` của danh mục khi có, để lời hứa trên thẻ và trên bảng là một. */
export function processingRows(catalog: readonly ToolDefinition[], groupLabels: ReadonlyMap<string, string>): ProcessingRow[] {
  return readyFirst([...catalog]).map((tool) => {
    const mode = MODE_OF[toolProcessing(tool)]
    return { tool, group: groupLabels.get(tool.categories[0]) ?? '', mode, note: tool.privacyNote ?? defaultNote(tool, mode) }
  })
}

export function filterProcessingRows(rows: readonly ProcessingRow[], filter: ProcessingFilter, keyword: string): ProcessingRow[] {
  const tokens = normalizeTextSearch(keyword).split(' ').filter(Boolean)
  return rows.filter((row) => {
    if (filter !== 'all' && row.mode !== filter) return false
    if (tokens.length === 0) return true
    const haystack = normalizeTextSearch(`${row.tool.name} ${row.tool.description} ${row.group} ${row.tool.synonyms?.join(' ') ?? ''}`)
    return tokens.every((token) => haystack.includes(token))
  })
}
