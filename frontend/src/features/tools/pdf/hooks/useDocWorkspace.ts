import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { newId } from '@/utils/id'
import type { Decorations } from '../types/decorations.types'
import type { FormValues } from '../types/form.types'
import type { ImageSheet, ImageSource, InsertPosition, PageRef, RejectedFile, SourceFile } from '../types/doc-tools.types'
import type { Markup, Rect } from '../types/markup.types'
import { ingestFile, type IngestResult } from '../services/ingest'
import { copyOcrTexts } from '../services/ocr-store'
import { cropPage, makeCollage } from '../services/page-edit'
import { clearPageSizes, sheetLayoutOf } from '../services/page-size'
import { releaseAll } from '../services/pdf-render'
import { releaseThumbnails } from '../services/thumbnails'
import { clearTextLayer } from '../services/text-layer'
import { fillForm } from '../services/pdf-form'
import { fixScanPage } from '../services/scan-cleanup'
import type { LockKind } from '../services/pdf-unlock'
import { clearReflowProbes, rewriteText as rewritePageText, type ReflowRequest } from '../services/text-reflow'
import { clearTextStyles } from '../services/text-style'
import { megabytes, TOOL_ERROR, TOOL_LIMITS } from '@/features/tools/hub'
import { isDefaultSheet, sameSheet, type CollageSize } from '../utils/image-sheet'
import type { ScanFix } from '../utils/scan-plan'
import {
  appendPageMarkups,
  combinePages,
  deletePages,
  duplicatePages,
  movePages,
  replacePage,
  rotatePages,
  setPageMarkups,
  shiftPage,
} from '../utils/page-ops'
import { applySheet, type SheetMove } from '../utils/sheet-ops'
import { initialWorkspace, workspaceReducer, type SelectMode } from '../utils/workspace-reducer'

export interface Placement {
  anchorId: string | null
  position: InsertPosition
}

/** Tệp PDF cần mật khẩu — chờ người dùng nhập rồi mới nạp. */
export interface LockedFile {
  name: string
  bytes: Uint8Array<ArrayBuffer>
  kind: LockKind
}

export interface AddResult {
  added: number
  rejected: RejectedFile[]
  locked: LockedFile[]
}

export interface LoadingProgress {
  done: number
  total: number
}

/** Khổ giấy đang dùng cho trang ảnh = khổ của trang ảnh đầu tiên (mọi trang ảnh đổi khổ cùng lúc). */
export function currentImageSheet(pages: PageRef[], sources: Record<string, SourceFile>): ImageSheet | undefined {
  return pages.find((page) => sources[page.sourceId]?.kind !== 'pdf' && sources[page.sourceId])?.sheet
}

/** Trang gộp được: ảnh đơn, chưa có dấu — dấu trên ảnh gộp phải vẽ lại vì ảnh đổi chỗ, đổi cỡ. */
function isCombinable(page: PageRef, sources: Record<string, SourceFile>): boolean {
  return sources[page.sourceId]?.kind === 'image' && !page.markups?.length
}

/** Phiên làm việc của Công cụ PDF: tệp nguồn, thứ tự trang, vùng chọn, hoàn tác. */
export function useDocWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace)
  const [loading, setLoading] = useState<LoadingProgress | null>(null)

  // Nạp tệp là việc bất đồng bộ — đọc trang HIỆN TẠI qua ref, không qua closure cũ.
  const latest = useRef({ pages: state.pages, sources: state.sources })
  useEffect(() => {
    latest.current = { pages: state.pages, sources: state.sources }
  }, [state.pages, state.sources])

  useEffect(
    () => () => {
      releaseAll()
      releaseThumbnails()
      clearPageSizes()
      clearTextLayer()
      clearTextStyles()
      clearReflowProbes()
    },
    [],
  )

  const addFiles = useCallback(
    async (files: File[], placement: Placement = { anchorId: null, position: 'after' }): Promise<AddResult> => {
      const sources: SourceFile[] = []
      const pages: PageRef[] = []
      const rejected: RejectedFile[] = []
      const locked: LockedFile[] = []

      // Mọi tệp nguồn nằm trong RAM suốt phiên: chặn theo TỔNG, không chỉ theo từng tệp. Chỉ đếm tệp
      // người dùng thả vào — nguồn dẫn xuất (cắt trang, điền form) không được ăn vào trần của họ.
      let held = Object.values(latest.current.sources).reduce((sum, source) => sum + ('originId' in source && source.originId ? 0 : source.size), 0)

      setLoading({ done: 0, total: files.length })
      try {
        for (const [index, file] of files.entries()) {
          const result = await ingestFile(file)
          setLoading({ done: index + 1, total: files.length })

          if (!result.ok && 'locked' in result) {
            locked.push({ name: file.name, bytes: result.bytes, kind: result.locked })
          } else if (!result.ok) {
            rejected.push({ name: file.name, code: result.code, reason: result.reason })
          } else if (latest.current.pages.length + pages.length + result.pages.length > TOOL_LIMITS.totalPages) {
            rejected.push({ name: file.name, code: TOOL_ERROR.pageLimit, reason: `Vượt trần ${TOOL_LIMITS.totalPages} trang cho một phiên.` })
          } else if (held + result.source.size > TOOL_LIMITS.heldBytes) {
            rejected.push({ name: file.name, code: TOOL_ERROR.fileTooLarge, reason: `Tổng dung lượng vượt ${megabytes(TOOL_LIMITS.heldBytes)} cho một phiên.` })
          } else {
            sources.push(result.source)
            pages.push(...result.pages)
            held += result.source.size
          }
        }
      } finally {
        setLoading(null)
      }

      // Ảnh thả thêm vào theo khổ giấy đang dùng — một tài liệu nửa A4 nửa A3 không ai muốn.
      const sheet = currentImageSheet(latest.current.pages, latest.current.sources)
      const imageIds = new Set(sources.filter((source) => source.kind === 'image').map((source) => source.id))
      const placed = sheet && !isDefaultSheet(sheet) ? pages.map((page) => (imageIds.has(page.sourceId) ? { ...page, sheet } : page)) : pages

      // Một lần dispatch cho cả lô: hoàn tác gỡ cả lượt thả, không gỡ từng tệp.
      if (placed.length > 0) dispatch({ type: 'add', sources, pages: placed, ...placement })
      return { added: sources.length, rejected, locked }
    },
    [],
  )

  const prepareReplacement = useCallback(async (file: File): Promise<IngestResult> => {
    setLoading({ done: 0, total: 1 })
    try {
      return await ingestFile(file)
    } finally {
      setLoading(null)
    }
  }, [])

  const commitReplacement = useCallback((source: SourceFile, pageIndex: number, targetId: string) => {
    dispatch({ type: 'replace', source, targetId, page: { id: newId(), sourceId: source.id, pageIndex, rotation: 0 } })
  }, [])

  const edit = useCallback((next: (pages: PageRef[]) => PageRef[]) => dispatch({ type: 'edit', next }), [])

  const setDecorations = useCallback(
    (decorations: Decorations, mergeKey?: string) => dispatch({ type: 'decorate', decorations, mergeKey }),
    [],
  )

  /** Gộp các trang ảnh đang chọn, `size` ảnh một trang. Trả số trang gộp tạo ra và số trang bị bỏ qua. */
  const combine = useCallback(
    (size: CollageSize) => {
      const { pages, sources } = latest.current
      const chosen = new Set(state.selected)
      const eligible = pages.filter((page) => chosen.has(page.id) && isCombinable(page, sources))
      const created = new Map<string, PageRef>()
      const collages: SourceFile[] = []
      let merged = 0
      for (let start = 0; start + 1 < eligible.length; start += size) {
        const group = eligible.slice(start, start + size)
        merged += group.length
        const source = makeCollage(group.map((page) => ({ source: sources[page.sourceId] as ImageSource, rotation: page.rotation })))
        collages.push(source)
        created.set(group[0].id, { id: newId(), sourceId: source.id, pageIndex: 0, rotation: 0, sheet: group[0].sheet })
      }
      if (created.size > 0) {
        const ids = eligible.map((page) => page.id)
        dispatch({ type: 'edit', next: (current) => combinePages(current, ids, size, (group) => created.get(group[0].id) ?? null), sources: collages })
      }
      return { created: created.size, skipped: chosen.size - merged }
    },
    [state.selected],
  )

  /** Đổi khổ giấy / lề cho MỌI trang ảnh — tính chỗ đặt ảnh mới trước rồi mới sửa một lần. */
  const setImageSheet = useCallback(async (sheet: ImageSheet) => {
    const { pages, sources } = latest.current
    const moves = new Map<string, SheetMove>()
    await Promise.all(
      pages.map(async (page) => {
        const source = sources[page.sourceId]
        if (!source || source.kind === 'pdf' || sameSheet(page.sheet, sheet)) return
        const [from, to] = await Promise.all([sheetLayoutOf(source, page.sheet), sheetLayoutOf(source, sheet)])
        moves.set(page.id, { from: from.slots, to: to.slots })
      }),
    )
    if (moves.size > 0) dispatch({ type: 'edit', next: (current) => applySheet(current, sheet, moves) })
  }, [])

  /** Cắt trang theo vùng `area` (pt, khung gốc). `false` = vùng quá nhỏ / nằm ngoài nội dung. */
  const crop = useCallback(async (id: string, area: Rect): Promise<boolean> => {
    const { pages, sources } = latest.current
    const page = pages.find((item) => item.id === id)
    const source = page && sources[page.sourceId]
    if (!page || !source) return false
    const result = await cropPage(source, page, area)
    if (!result) return false
    dispatch({ type: 'edit', next: (current) => replacePage(current, id, [result.page]), sources: [result.source] })
    return true
  }, [])

  /**
   * Sửa chữ bằng cách viết lại trang. `null` = trang đã đổi nguồn từ lúc lên kế
   * hoạch (hoàn tác, cắt…); có kết quả thì `spill` là số trang mới chứa phần tràn —
   * chúng vào cùng một mốc hoàn tác với lần sửa.
   */
  const rewriteText = useCallback(async (id: string, request: ReflowRequest): Promise<{ spill: number } | null> => {
    const { pages, sources } = latest.current
    const page = pages.find((item) => item.id === id)
    const source = page && sources[page.sourceId]
    if (!page || source?.kind !== 'pdf' || source.id !== request.sourceId) return null
    const result = await rewritePageText(source, page, request)
    const sheets = [result, ...result.spill]
    dispatch({ type: 'edit', next: (current) => replacePage(current, id, sheets.map((sheet) => sheet.page)), sources: sheets.map((sheet) => sheet.source) })
    return { spill: result.spill.length }
  }, [])

  /**
   * Dọn bản scan: bỏ trang trắng, chỉnh nghiêng / cắt viền từng trang. Cả lô
   * là MỘT mốc hoàn tác; trang không sửa được (đã bị xoá trong lúc chờ) bị bỏ qua.
   */
  const cleanScan = useCallback(async (remove: string[], fixes: ReadonlyMap<string, ScanFix>): Promise<number> => {
    const replaced = new Map<string, PageRef>()
    const added: SourceFile[] = []
    for (const [id, fix] of fixes) {
      const { pages, sources } = latest.current
      const page = pages.find((item) => item.id === id)
      const source = page && sources[page.sourceId]
      if (!page || !source) continue
      const result = await fixScanPage(source, page, fix)
      if (!result) continue
      replaced.set(id, result.page)
      added.push(...result.sources)
    }
    const removed = new Set(remove)
    if (removed.size === 0 && replaced.size === 0) return 0
    dispatch({
      type: 'edit',
      next: (current) => current.filter((page) => !removed.has(page.id)).map((page) => replaced.get(page.id) ?? page),
      sources: added,
    })
    return removed.size + replaced.size
  }, [])

  /**
   * Điền form: mỗi tệp thành một tệp nguồn mới, mọi trang của tệp cũ trỏ sang
   * (giữ id trang — đang chọn, đang xem vẫn đúng). Cả lô là MỘT mốc hoàn tác.
   */
  const fillForms = useCallback(async (requests: { sourceId: string; values: FormValues }[], flatten: boolean): Promise<number> => {
    const filled = new Map<string, SourceFile>()
    for (const { sourceId, values } of requests) {
      const source = latest.current.sources[sourceId]
      if (source?.kind !== 'pdf') continue
      const next = await fillForm(source, values, { flatten })
      copyOcrTexts(source.id, next.id)
      filled.set(source.id, next)
    }
    if (filled.size > 0) {
      const repoint = (page: PageRef) => {
        const next = filled.get(page.sourceId)
        return next ? { ...page, sourceId: next.id } : page
      }
      dispatch({ type: 'edit', next: (current) => current.map(repoint), sources: [...filled.values()] })
    }
    return filled.size
  }, [])

  const selected = state.selected
  const combinable = useMemo(() => {
    const chosen = new Set(selected)
    return state.pages.filter((page) => chosen.has(page.id) && isCombinable(page, state.sources)).length
  }, [selected, state.pages, state.sources])
  const imageSheet = useMemo(() => currentImageSheet(state.pages, state.sources), [state.pages, state.sources])
  const hasImagePages = useMemo(() => state.pages.some((page) => state.sources[page.sourceId]?.kind !== 'pdf'), [state.pages, state.sources])

  const actions = useMemo(
    () => ({
      rotate: (delta: 90 | -90) => edit((pages) => rotatePages(pages, selected, delta)),
      remove: () => edit((pages) => deletePages(pages, selected)),
      duplicate: () => edit((pages) => duplicatePages(pages, selected, newId)),
      move: (ids: string[], targetIndex: number) => edit((pages) => movePages(pages, ids, targetIndex)),
      shift: (id: string, delta: -1 | 1) => edit((pages) => shiftPage(pages, id, delta)),
      setMarkups: (id: string, markups: Markup[]) => edit((pages) => setPageMarkups(pages, id, markups)),
      appendMarkups: (additions: ReadonlyMap<string, Markup[]>) => edit((pages) => appendPageMarkups(pages, additions)),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      select: (id: string, mode: SelectMode) => dispatch({ type: 'select', id, mode }),
      selectAll: () => dispatch({ type: 'selectAll' }),
      clearSelection: () => dispatch({ type: 'clearSelection' }),
      reset: () => {
        releaseAll()
        releaseThumbnails()
        clearPageSizes()
        clearTextLayer()
        clearTextStyles()
        clearReflowProbes()
        dispatch({ type: 'reset' })
      },
    }),
    [edit, selected],
  )

  return {
    sources: state.sources,
    pages: state.pages,
    selected: state.selected,
    /** Số trang đang chọn gộp được (ảnh đơn, chưa đánh dấu). */
    combinable,
    imageSheet,
    hasImagePages,
    decorations: state.decorations,
    setDecorations,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    loading,
    addFiles,
    combine,
    setImageSheet,
    crop,
    rewriteText,
    cleanScan,
    fillForms,
    prepareReplacement,
    commitReplacement,
    ...actions,
  }
}

export type DocWorkspace = ReturnType<typeof useDocWorkspace>
