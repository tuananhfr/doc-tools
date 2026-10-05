import { useCallback, useEffect, useMemo, useState } from 'react'
import { readForm } from '../services/pdf-form'
import type { PageRef, PdfSource, SourceFile } from '../types/doc-tools.types'
import type { FormInfo, FormValue, FormValues } from '../types/form.types'
import { pendingChanges, placeFields, type PlacedField } from '../utils/form-values'

export interface FormGroup {
  source: PdfSource
  /** Chưa đọc xong = undefined; đọc lỗi = null. */
  info: FormInfo | null | undefined
  placed: PlacedField[]
  /** Trường chỉ nằm ở trang đã bỏ khỏi tài liệu. */
  hidden: number
  draft: FormValues
  changes: FormValues
}

type FillForms = (requests: { sourceId: string; values: FormValues }[], flatten: boolean) => Promise<number>

/**
 * Bản nháp giá trị form theo từng tệp nguồn. Gõ chỉ sửa nháp — dựng lại tệp
 * PDF mỗi phím gõ là quá nặng với tệp lớn; "Áp dụng" mới ghi thành tệp mới.
 */
export function useFormFill(pages: PageRef[], sources: Record<string, SourceFile>, fillForms: FillForms) {
  const [infos, setInfos] = useState<Record<string, FormInfo | null>>({})
  const [drafts, setDrafts] = useState<Record<string, FormValues>>({})
  const [flatten, setFlatten] = useState(false)
  const [applying, setApplying] = useState(false)

  const formSources = useMemo(() => {
    const seen = new Map<string, PdfSource>()
    for (const page of pages) {
      const source = sources[page.sourceId]
      if (source?.kind === 'pdf' && source.form && !seen.has(source.id)) seen.set(source.id, source)
    }
    return [...seen.values()]
  }, [pages, sources])

  useEffect(() => {
    let alive = true
    for (const source of formSources) {
      if (source.id in infos) continue
      readForm(source).then(
        (info) => alive && setInfos((current) => ({ ...current, [source.id]: info })),
        () => alive && setInfos((current) => ({ ...current, [source.id]: null })),
      )
    }
    return () => {
      alive = false
    }
  }, [formSources, infos])

  const groups = useMemo<FormGroup[]>(
    () =>
      formSources.map((source) => {
        const info = infos[source.id]
        const draft = drafts[source.id] ?? {}
        const { placed, hidden } = info ? placeFields(info.fields, source.id, pages) : { placed: [], hidden: 0 }
        return { source, info, placed, hidden, draft, changes: info ? pendingChanges(info.fields, draft) : {} }
      }),
    [formSources, infos, drafts, pages],
  )

  const pending = groups.reduce((sum, group) => sum + Object.keys(group.changes).length, 0)
  const lockable = groups.some((group) => group.placed.length > 0)

  const setValue = useCallback((sourceId: string, name: string, value: FormValue) => {
    setDrafts((current) => ({ ...current, [sourceId]: { ...current[sourceId], [name]: value } }))
  }, [])

  const discard = useCallback(() => setDrafts({}), [])

  /** Ghi nháp vào tệp. Khoá form thì áp cho MỌI tệp có form, kể cả tệp không sửa gì. */
  const apply = useCallback(async (): Promise<{ files: number; fields: number }> => {
    const requests = groups
      .filter((group) => Object.keys(group.changes).length > 0 || (flatten && group.placed.length > 0))
      .map((group) => ({ sourceId: group.source.id, values: group.changes }))
    if (requests.length === 0) return { files: 0, fields: 0 }
    setApplying(true)
    try {
      const files = await fillForms(requests, flatten)
      const done = new Set(requests.map((request) => request.sourceId))
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !done.has(id))))
      return { files, fields: pending }
    } finally {
      setApplying(false)
    }
  }, [groups, flatten, fillForms, pending])

  return { groups, pending, lockable, flatten, setFlatten, applying, setValue, discard, apply }
}

export type FormFill = ReturnType<typeof useFormFill>
