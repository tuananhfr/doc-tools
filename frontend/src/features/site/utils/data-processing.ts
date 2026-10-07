import { normalizeTextSearch } from '@/utils/text-search'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { toolProcessing } from '@/features/tools/hub/utils/tool-registry'
import { readyFirst } from './hub-tools'

export type ProcessingMode = 'device' | 'model' | 'server'
export type ProcessingFilter = ProcessingMode | 'all'

export const PROCESSING_FILTERS: readonly ProcessingFilter[] = ['all', 'device', 'model', 'server']

/** Ghi chú mặc định khi danh mục không có `privacyNote`; chữ ở `site:data.notes.<id>`. */
export type ProcessingNote = 'server' | 'model' | 'noFile' | 'device'

export interface ProcessingRow {
  tool: ToolDefinition
  group: string
  mode: ProcessingMode
  /** `privacyNote` của danh mục; không có thì hiện `defaultNote`. */
  note?: string
  defaultNote: ProcessingNote
}

const MODE_OF = { browser: 'device', 'browser-model': 'model', server: 'server' } as const

function defaultNote(tool: ToolDefinition, mode: ProcessingMode): ProcessingNote {
  if (mode === 'server' || mode === 'model') return mode
  return tool.noFile ? 'noFile' : 'device'
}

/** Một dòng / công cụ; ghi chú lấy `privacyNote` của danh mục khi có, để lời hứa trên thẻ và trên bảng là một. */
export function processingRows(catalog: readonly ToolDefinition[], groupLabels: ReadonlyMap<string, string>): ProcessingRow[] {
  return readyFirst([...catalog]).map((tool) => {
    const mode = MODE_OF[toolProcessing(tool)]
    return { tool, group: groupLabels.get(tool.categories[0]) ?? '', mode, note: tool.privacyNote, defaultNote: defaultNote(tool, mode) }
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
