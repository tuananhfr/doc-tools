import { useMemo, useState } from 'react'
import { newId } from '@/utils/id'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import type { Markup } from '../types/markup.types'
import { textWidthRatio } from '../services/text-layer'
import { requestLocalFonts, resolveLocalFontSoon } from '../services/local-fonts'
import { loadFontFace, loadTextMeasure } from '../services/text-measure'
import { inspectText } from '../services/text-style'
import { coverFrames, replacedTextEdit } from '../utils/markup-draft'
import { orientedBounds } from '../utils/markup-geometry'
import type { SearchHit } from './useTextSearch'

/** Chữ mới rộng hơn chữ cũ quá mức này thì báo — dễ đè lên chữ đứng sau trên cùng dòng. */
const TOO_LONG = 1.1

const NONE: ReadonlySet<string> = new Set()

interface Options {
  hits: SearchHit[]
  pages: PageRef[]
  sources: Record<string, SourceFile>
  searching: boolean
  onApply: (additions: Map<string, Markup[]>, count: number) => void
}

export function isReplaceable(hit: SearchHit): boolean {
  return hit.spans.length === 1 && hit.fontRun !== null
}

/**
 * Tìm & thay: KHÔNG chọn sẵn chỗ nào — thay hàng loạt trên hợp đồng mà không
 * nhìn từng chỗ là sửa nhầm "XL-03" trong câu dẫn chiếu tới gói thầu khác.
 * Mỗi lần thay là một bước hoàn tác cho mọi trang.
 */
export function useFindReplace({ hits, pages, sources, searching, onApply }: Options) {
  const [open, setOpen] = useState(false)
  const [replacement, setReplacement] = useState('')
  const [running, setRunning] = useState(false)
  // Gắn với mảng kết quả: tìm chữ khác (mảng mới) là bỏ chọn — khỏi thay nhầm chỗ của lần tìm trước.
  const [selection, setSelection] = useState<{ of: SearchHit[]; ids: ReadonlySet<string> }>({ of: hits, ids: NONE })
  const [done, setDone] = useState<{ of: SearchHit[]; ids: ReadonlySet<string> }>({ of: hits, ids: NONE })
  const selected = selection.of === hits ? selection.ids : NONE
  const replaced = done.of === hits ? done.ids : NONE

  const tooLong = useMemo(() => {
    const flagged = new Set<string>()
    if (!open || !replacement) return flagged
    for (const hit of hits) {
      if (!hit.fontRun || !isReplaceable(hit)) continue
      const original = hit.spans[0].text
      if (textWidthRatio(hit.fontRun, original, replacement) > TOO_LONG) flagged.add(hit.id)
    }
    return flagged
  }, [open, replacement, hits])

  const selectable = (hit: SearchHit) => !searching && !running && isReplaceable(hit) && !replaced.has(hit.id)

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    setSelection({ of: hits, ids: next })
  }

  const candidates = hits.filter(selectable)
  const allSelected = candidates.length > 0 && candidates.every((hit) => selected.has(hit.id))
  const toggleAll = (on: boolean) => setSelection({ of: hits, ids: on ? new Set(candidates.map((hit) => hit.id)) : NONE })

  const apply = async () => {
    const chosen = hits.filter((hit) => selected.has(hit.id) && selectable(hit))
    if (chosen.length === 0) return
    // Trước mọi `await`: hộp hỏi quyền đọc phông trên máy chỉ hiện khi còn trong thao tác bấm.
    void requestLocalFonts()
    setRunning(true)
    try {
      const measure = await loadTextMeasure()
      const byId = new Map(pages.map((page) => [page.id, page]))
      const additions = new Map<string, Markup[]>()
      const applied = new Set(replaced)
      for (const hit of chosen) {
        const page = byId.get(hit.pageId)
        const source = page && sources[page.sourceId]
        if (!page || !source) continue
        const span = hit.spans[0]
        const look = await inspectText(source, page, orientedBounds(coverFrames([span])[0]), hit.fontRun)
        const local = await resolveLocalFontSoon(look.sourceFont, look.font)
        const font = local ? { ...look.font, local } : look.font
        await loadFontFace(font)
        const markup = replacedTextEdit(newId(), span, { ...look, font }, replacement, measure)
        if (!markup) continue
        additions.set(page.id, [...(additions.get(page.id) ?? []), markup])
        applied.add(hit.id)
      }
      const count = [...additions.values()].reduce((sum, list) => sum + list.length, 0)
      if (count > 0) onApply(additions, count)
      setDone({ of: hits, ids: applied })
      setSelection({ of: hits, ids: NONE })
    } finally {
      setRunning(false)
    }
  }

  return { open, setOpen, replacement, setReplacement, running, selected, replaced, tooLong, selectable, toggle, allSelected, toggleAll, candidates: candidates.length, apply }
}

export type FindReplace = ReturnType<typeof useFindReplace>
