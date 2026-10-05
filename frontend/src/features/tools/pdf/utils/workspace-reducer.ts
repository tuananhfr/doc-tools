import type { Decorations } from '../types/decorations.types'
import type { InsertPosition, PageRef, SourceFile } from '../types/doc-tools.types'
import { NO_DECORATIONS } from './decorations'
import { insertPages, replacePage } from './page-ops'

/** Đủ cho một phiên thao tác dài; mỗi mốc chỉ là mảng tham chiếu, không chép byte. */
const HISTORY_LIMIT = 100

export interface WorkspaceState {
  /** Tệp nguồn giữ lại cả khi không còn trang nào dùng — hoàn tác cần đến chúng. */
  sources: Record<string, SourceFile>
  pages: PageRef[]
  selected: string[]
  /** Trang bấm gần nhất — mốc cho Shift+bấm chọn một dải. */
  anchorId: string | null
  decorations: Decorations
  past: Snapshot[]
  future: Snapshot[]
  /** Khoá của lần `decorate` vừa rồi — lần kế cùng khoá gộp vào CÙNG một mốc hoàn tác. */
  mergeKey: string | null
}

/** Mốc hoàn tác: trang trí đi cùng thứ tự trang, không phải một chồng hoàn tác riêng. */
interface Snapshot {
  pages: PageRef[]
  decorations: Decorations
}

export type SelectMode = 'toggle' | 'range' | 'only'

export type WorkspaceAction =
  | { type: 'add'; sources: SourceFile[]; pages: PageRef[]; anchorId: string | null; position: InsertPosition }
  | { type: 'replace'; source: SourceFile; page: PageRef; targetId: string }
  /** `sources`: nguồn mới sinh ra từ chính lần sửa này (trang gộp ảnh, trang đã cắt). */
  | { type: 'edit'; next: (pages: PageRef[]) => PageRef[]; sources?: SourceFile[] }
  /**
   * Gõ từng phím vào ô đầu trang hay kéo thanh trượt độ trong sinh hàng chục
   * lần sửa — cùng `mergeKey` liên tiếp thì Ctrl+Z gỡ cả lượt, không gỡ từng ký tự.
   */
  | { type: 'decorate'; decorations: Decorations; mergeKey?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; id: string; mode: SelectMode }
  | { type: 'selectAll' }
  | { type: 'clearSelection' }
  | { type: 'reset' }

export const initialWorkspace: WorkspaceState = {
  sources: {},
  pages: [],
  selected: [],
  anchorId: null,
  decorations: NO_DECORATIONS,
  past: [],
  future: [],
  mergeKey: null,
}

function keepExisting(selected: string[], pages: PageRef[]): string[] {
  if (selected.length === 0) return selected
  const alive = new Set(pages.map((page) => page.id))
  return selected.filter((id) => alive.has(id))
}

function snapshot(state: WorkspaceState): Snapshot {
  return { pages: state.pages, decorations: state.decorations }
}

function commit(state: WorkspaceState, pages: PageRef[], sources = state.sources): WorkspaceState {
  if (pages === state.pages && sources === state.sources) return state
  return {
    ...state,
    sources,
    pages,
    selected: keepExisting(state.selected, pages),
    past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
    mergeKey: null,
  }
}

function decorate(state: WorkspaceState, decorations: Decorations, mergeKey: string | null): WorkspaceState {
  if (decorations === state.decorations) return state
  const merging = mergeKey !== null && mergeKey === state.mergeKey
  return {
    ...state,
    decorations,
    past: merging ? state.past : [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
    mergeKey,
  }
}

function restore(state: WorkspaceState, target: Snapshot, past: Snapshot[], future: Snapshot[]): WorkspaceState {
  return {
    ...state,
    pages: target.pages,
    decorations: target.decorations,
    selected: keepExisting(state.selected, target.pages),
    past,
    future,
    mergeKey: null,
  }
}

function selectRange(state: WorkspaceState, id: string): string[] {
  const order = state.pages.map((page) => page.id)
  const from = state.anchorId ? order.indexOf(state.anchorId) : -1
  const to = order.indexOf(id)
  if (from < 0 || to < 0) return [id]

  const [start, end] = from < to ? [from, to] : [to, from]
  return [...new Set([...state.selected, ...order.slice(start, end + 1)])]
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'add': {
      const sources = { ...state.sources }
      for (const source of action.sources) sources[source.id] = source
      return commit(state, insertPages(state.pages, action.pages, action.anchorId, action.position), sources)
    }

    case 'replace':
      return commit(state, replacePage(state.pages, action.targetId, [action.page]), {
        ...state.sources,
        [action.source.id]: action.source,
      })

    case 'edit': {
      const next = action.next(state.pages)
      if (!action.sources?.length || next === state.pages) return commit(state, next)
      const sources = { ...state.sources }
      for (const source of action.sources) sources[source.id] = source
      return commit(state, next, sources)
    }

    case 'decorate':
      return decorate(state, action.decorations, action.mergeKey ?? null)

    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return restore(state, previous, state.past.slice(0, -1), [snapshot(state), ...state.future])
    }

    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return restore(state, next, [...state.past, snapshot(state)], rest)
    }

    case 'select': {
      if (action.mode === 'only') return { ...state, selected: [action.id], anchorId: action.id }
      if (action.mode === 'range') return { ...state, selected: selectRange(state, action.id), anchorId: action.id }
      const selected = state.selected.includes(action.id)
        ? state.selected.filter((id) => id !== action.id)
        : [...state.selected, action.id]
      return { ...state, selected, anchorId: action.id }
    }

    case 'selectAll':
      return { ...state, selected: state.pages.map((page) => page.id) }

    case 'clearSelection':
      return { ...state, selected: [], anchorId: null }

    case 'reset':
      return initialWorkspace
  }
}
