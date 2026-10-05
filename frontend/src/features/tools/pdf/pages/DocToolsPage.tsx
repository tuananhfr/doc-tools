import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ui'
import { ToolLeaveGuard } from '@/features/tools/hub'
import { useAuthStore } from '@/store/auth.store'
import { DEFAULT_PDF_OUTPUT, type ImageSheet, type InsertPosition, type RejectedFile, type SourceFile } from '../types/doc-tools.types'
import type { Rect } from '../types/markup.types'
import type { StampView } from '../components/DecorationOverlay'
import { DecorationPanel } from '../components/DecorationPanel'
import { DocSidePanel, type SideTab } from '../components/DocSidePanel'
import { DocToolbar } from '../components/DocToolbar'
import { DropZone } from '../components/DropZone'
import { ExportJump } from '../components/ExportJump'
import { ExportPanel } from '../components/ExportPanel'
import { FormFillPanel } from '../components/FormFillPanel'
import { ImageSheetFields } from '../components/ImageSheetFields'
import { PageGrid } from '../components/PageGrid'
import { PagePreviewModal } from '../components/PagePreviewModal'
import { ReplacePageModal } from '../components/ReplacePageModal'
import { ScanCleanupModal } from '../components/ScanCleanupModal'
import { OcrSection } from '../components/OcrSection'
import { SearchPanel } from '../components/SearchPanel'
import { SuggestionBar } from '../components/SuggestionBar'
import { UnlockPdfModal } from '../components/UnlockPdfModal'
import { useDocExport, type ExportKind } from '../hooks/useDocExport'
import { useDocWorkspace, type AddResult, type Placement } from '../hooks/useDocWorkspace'
import { takeHandoff } from '../services/handoff'
import type { ReflowRequest } from '../services/text-reflow'
import { useFindReplace } from '../hooks/useFindReplace'
import { useFormFill } from '../hooks/useFormFill'
import { useOcr } from '../hooks/useOcr'
import { useScanCleanup } from '../hooks/useScanCleanup'
import { useTextSearch, type SearchHit } from '../hooks/useTextSearch'
import { useUnlockQueue } from '../hooks/useUnlockQueue'
import { formatStampDate, resolveDecorations } from '../utils/decorations'
import { EXPORT_SECTION, SIDE_PANEL_ID, type ExportSection } from '../utils/export-sections'
import { baseName, sanitizeFileName } from '../utils/file-guard'
import { isTyping } from '../utils/is-typing'
import type { CollageSize } from '../utils/image-sheet'
import { pickFiles } from '../utils/pick-files'
import { suggestActions, type SuggestionId } from '../utils/suggest-actions'

interface PendingReplace {
  source: SourceFile
  targetId: string
  position: number
}

function describeRejected(rejected: RejectedFile[]) {
  return (
    <>
      Bỏ qua {rejected.length} tệp:
      <ul className="mb-0 ps-3">
        {rejected.slice(0, 5).map((item, index) => (
          <li key={`${item.name}-${index}`}>
            <strong>{item.name}</strong> — {item.reason}
          </li>
        ))}
        {rejected.length > 5 ? <li>… và {rejected.length - 5} tệp khác</li> : null}
      </ul>
    </>
  )
}

/**
 * TRÌNH CHỈNH SỬA PDF — bản Free của ERPCons DocTools (hồ sơ DocTools 00/01/10).
 *
 * Nằm NGOÀI mọi guard: spec 10 yêu cầu tác vụ nhanh không bắt đăng nhập. Tệp
 * được đọc, sắp xếp và dựng lại hoàn toàn trong trình duyệt, không lưu, không
 * gửi đi, 0 AI (spec 01 + 07). Lệnh gọi máy chủ duy nhất là bộ đếm lượt mở của
 * hub (`POST /tools/visits`, chỉ mang slug công cụ).
 *
 * Khung, tiêu đề tab và đường về trang chọn công cụ do "Chuyện Nhỏ"
 * (`features/tools/hub`) lo. Trang này mở ở hai slug (Chỉnh sửa PDF, Xem PDF) và
 * không phân biệt chúng; việc làm nhanh một bước đã có công cụ riêng (`pages/quick/`).
 */
export default function DocToolsPage() {
  const toast = useToast()
  const workspace = useDocWorkspace()
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  // Ở trang chứ không ở bảng xuất: `{file}` trên lớp phủ phải đổi theo từng phím gõ.
  const [exportName, setExportName] = useState('')
  const [sideTab, setSideTab] = useState<SideTab>('export')
  const searchInput = useRef<HTMLInputElement>(null)
  const guest = useAuthStore((state) => state.status) === 'unauthenticated'
  // Gợi ý ẩn theo PHIÊN tệp (khoá = nguồn đầu tiên): làm lại từ đầu, thả tệp mới thì hiện lại.
  const [suggestHiddenFor, setSuggestHiddenFor] = useState<string | null>(null)
  // Cũng theo phiên tệp: "Đã tải xong" không được treo sang bộ tệp mới chưa xuất gì.
  const [nudge, setNudge] = useState<{ kind: ExportKind; key: string | null } | null>(null)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  const { pages, selected, addFiles, decorations } = workspace
  const firstSource = pages.length > 0 ? workspace.sources[pages[0].sourceId] : undefined
  const defaultName = firstSource ? `${baseName(firstSource.name)}${Object.keys(workspace.sources).length > 1 ? ' - đã ghép' : ''}` : 'tai-lieu'
  const fileName = sanitizeFileName(exportName.trim() || defaultName)

  const resolved = useMemo(() => resolveDecorations(decorations, pages.map((page) => page.id)), [decorations, pages])
  const stamp = useMemo<StampView>(
    () => ({ decorations: resolved, meta: { fileName, date: formatStampDate(new Date()) }, total: pages.length }),
    [resolved, fileName, pages.length],
  )
  const exporter = useDocExport(workspace.sources, resolved)
  const search = useTextSearch(pages, workspace.sources)
  const ocr = useOcr(workspace.sources)
  const form = useFormFill(pages, workspace.sources, workspace.fillForms)
  const hasForms = form.groups.length > 0
  // Khoá form xong thì tệp hết form, tab biến mất — không để cột phải trống trơn.
  const activeTab: SideTab = sideTab === 'form' && !hasForms ? 'export' : sideTab
  const replace = useFindReplace({
    hits: search.hits,
    pages,
    sources: workspace.sources,
    searching: search.searching,
    onApply: (additions, count) => {
      workspace.appendMarkups(additions)
      toast.success(`Đã thay ${count} chỗ — Ctrl+Z để hoàn tác.`)
    },
  })
  const hitCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hit of search.hits) counts.set(hit.pageId, (counts.get(hit.pageId) ?? 0) + 1)
    return counts
  }, [search.hits])

  const openHit = useCallback(
    (hit: SearchHit) => {
      search.setActiveId(hit.id)
      setPreviewId(hit.pageId)
    },
    [search],
  )

  const stepHit = useCallback(
    (delta: 1 | -1) => {
      const { hits, activeIndex } = search
      if (hits.length === 0) return
      const next = activeIndex < 0 ? (delta > 0 ? 0 : hits.length - 1) : (activeIndex + delta + hits.length) % hits.length
      openHit(hits[next])
    },
    [search, openHit],
  )

  const sessionKey = Object.keys(workspace.sources)[0] ?? null
  const suggestions = useMemo(() => {
    const used = new Set(pages.map((page) => page.sourceId))
    let pdfFiles = 0
    let imageFiles = 0
    for (const id of used) {
      const kind = workspace.sources[id]?.kind
      if (kind === 'pdf') pdfFiles++
      else if (kind) imageFiles++
    }
    return suggestActions({ pdfFiles, imageFiles, pageCount: pages.length })
  }, [pages, workspace.sources])

  /** Sau mỗi lần tải được tệp: gợi ý đã hết vai trò; khách thì mời đăng nhập ngay dưới nút vừa bấm. */
  const afterExport = (kind: ExportKind) => (ok: boolean) => {
    if (!ok) return
    setSuggestHiddenFor(sessionKey)
    if (guest && !nudgeDismissed) setNudge({ kind, key: sessionKey })
  }

  const revealSection = (section: ExportSection) => {
    setSideTab('export')
    requestAnimationFrame(() => {
      const element = document.getElementById(EXPORT_SECTION[section])
      element?.scrollIntoView({ block: 'center' })
      element?.querySelector<HTMLElement>('input.form-control, select')?.focus({ preventScroll: true })
    })
  }

  const jumpToPanel = () => {
    setSideTab('export')
    requestAnimationFrame(() => document.getElementById(SIDE_PANEL_ID)?.scrollIntoView({ block: 'start' }))
  }

  // Gợi ý luôn xuất CẢ tài liệu với tuỳ chọn mặc định — muốn nén, chọn trang thì dùng bảng Xuất tệp.
  const runSuggestion = (id: SuggestionId) => {
    if (id === 'merge' || id === 'image-to-pdf') void exporter.exportPdf(pages, fileName, DEFAULT_PDF_OUTPUT).then(afterExport('pdf'))
    else if (id === 'pdf-to-word') void exporter.exportOffice('word', pages, fileName).then(afterExport('word'))
    else revealSection(id === 'split' ? 'split' : 'image')
  }

  const report = useCallback(
    (result: AddResult) => {
      if (result.rejected.length > 0) toast.warning(describeRejected(result.rejected))
      else if (result.added > 1) toast.success(`Đã thêm ${result.added} tệp.`)
    },
    [toast],
  )

  // Tệp có mật khẩu không bị từ chối: xếp hàng hỏi mật khẩu, mở được thì nạp lại bản đã giải.
  const unlock = useUnlockQueue(
    useCallback(async (file: File, placement?: Placement) => report(await addFiles([file], placement)), [addFiles, report]),
  )
  const { enqueue } = unlock

  const handleFiles = useCallback(
    async (files: File[], placement?: Placement) => {
      const result = await addFiles(files, placement)
      report(result)
      enqueue(result.locked, placement)
    },
    [addFiles, report, enqueue],
  )

  // "Sửa tiếp" từ công cụ nhanh: tệp kết quả chờ sẵn, nạp như vừa thả vào. Chỉ lúc mount —
  // `takeHandoff` trả tệp đúng một lần nên StrictMode chạy effect hai lần cũng không nạp đôi.
  useEffect(() => {
    const files = takeHandoff()
    if (files.length > 0) void handleFiles(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickAndAdd = async (placement?: Placement) => {
    const files = await pickFiles()
    if (files.length > 0) await handleFiles(files, placement)
  }

  const handleInsert = (position: InsertPosition) => {
    const [anchorId] = selected
    if (anchorId) void pickAndAdd({ anchorId, position })
  }

  const handleReplace = async () => {
    const [targetId] = selected
    if (!targetId) return
    const [file] = await pickFiles(false)
    if (!file) return

    const result = await workspace.prepareReplacement(file)
    if (!result.ok) {
      toast.warning(`${file.name} — ${result.reason}`)
      return
    }
    if (result.source.pageCount === 1) {
      workspace.commitReplacement(result.source, 0, targetId)
      return
    }
    setPendingReplace({ source: result.source, targetId, position: pages.findIndex((page) => page.id === targetId) + 1 })
  }

  const handleCombine = (size: CollageSize) => {
    const { created, skipped } = workspace.combine(size)
    const note = skipped > 0 ? ` Bỏ qua ${skipped} trang (không phải ảnh, đã đánh dấu hoặc lẻ nhóm).` : ''
    if (created > 0) toast.success(`Đã gộp thành ${created} trang — Ctrl+Z để hoàn tác.${note}`)
    else toast.warning(`Không gộp được trang nào.${note}`)
  }

  const [sheetBusy, setSheetBusy] = useState(false)
  const handleSheet = async (sheet: ImageSheet) => {
    setSheetBusy(true)
    try {
      await workspace.setImageSheet(sheet)
    } catch {
      toast.error('Không đổi được khổ giấy. Thử lại.')
    } finally {
      setSheetBusy(false)
    }
  }

  const handleFormApply = async () => {
    const flatten = form.flatten
    try {
      const { files, fields } = await form.apply()
      if (files === 0) return
      const what = fields > 0 ? `Đã điền ${fields} trường` : 'Đã khoá form'
      toast.success(`${what}${fields > 0 && flatten ? ' và khoá form' : ''} — Ctrl+Z để hoàn tác.`)
    } catch (error) {
      toast.error(error instanceof Error && error.message.startsWith('Không tải được phông') ? error.message : 'Không điền được form của tệp này.')
    }
  }

  const handleCrop = async (id: string, area: Rect): Promise<boolean> => {
    try {
      if (await workspace.crop(id, area)) {
        toast.success('Đã cắt trang — Ctrl+Z để hoàn tác.')
        return true
      }
      toast.warning('Vùng cắt quá nhỏ hoặc nằm ngoài nội dung trang.')
    } catch {
      toast.error('Không cắt được trang này.')
    }
    return false
  }

  const handleRewriteText = async (id: string, request: ReflowRequest): Promise<boolean> => {
    try {
      const result = await workspace.rewriteText(id, request)
      if (result?.spill) toast.info(`Phần tràn đã sang ${result.spill > 1 ? `${result.spill} trang mới` : 'một trang mới'} ngay sau trang này — Ctrl+Z để hoàn tác.`)
      if (result) return true
      toast.warning('Trang vừa đổi — bấm lại vào dòng chữ để sửa.')
    } catch (error) {
      toast.error(error instanceof Error && error.message.startsWith('Không tải được phông') ? error.message : 'Không sửa được chữ ở trang này. Thử lại.')
    }
    return false
  }

  const scan = useScanCleanup(workspace.cleanScan)

  const handleCleanScan = () => {
    const chosen = new Set(selected)
    const targets = chosen.size > 0 ? pages.filter((page) => chosen.has(page.id)) : pages
    const positions = new Map(pages.map((page, index) => [page.id, index + 1]))
    void scan.start(targets, positions, workspace.sources)
  }

  const handleScanApply = async () => {
    const removed = scan.plan.remove.length
    try {
      const changed = await scan.apply()
      const fixed = changed - removed
      const parts = [removed > 0 ? `bỏ ${removed} trang trắng` : '', fixed > 0 ? `sửa ${fixed} trang` : ''].filter(Boolean)
      if (parts.length) toast.success(`Đã ${parts.join(', ')} — Ctrl+Z để hoàn tác.`)
      else toast.warning('Không sửa được trang nào.')
    } catch {
      toast.error('Không dọn được bản scan. Thử lại.')
    }
  }

  const previewIndex = previewId ? pages.findIndex((page) => page.id === previewId) : -1
  const previewPage = previewIndex >= 0 ? pages[previewIndex] : undefined
  const previewSource = previewPage ? workspace.sources[previewPage.sourceId] : undefined
  const previewHits = useMemo(() => search.hits.filter((hit) => hit.pageId === previewId), [search.hits, previewId])
  const dialogOpen = !!previewPage || !!pendingReplace || !!unlock.current || scan.phase !== null

  const { undo, redo, remove, selectAll, clearSelection } = workspace
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (pages.length === 0 || dialogOpen) return
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      // Ctrl+F cả khi đang gõ ở ô khác: tìm của trình duyệt không thấy chữ trong canvas trang.
      if (mod && key === 'f') {
        event.preventDefault()
        setSideTab('search')
        requestAnimationFrame(() => searchInput.current?.select())
        return
      }
      // Hộp thoại đang mở: Delete / Ctrl+Z ở đây sẽ xoá, hoàn tác trang nằm KHUẤT sau nó.
      if (isTyping(event.target)) return

      if (mod && key === 'z' && !event.shiftKey) undo()
      else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) redo()
      else if (mod && key === 'a') selectAll()
      else if (key === 'delete' && selected.length > 0) remove()
      else if (key === 'escape') clearSelection()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages.length, selected.length, dialogOpen, undo, redo, remove, selectAll, clearSelection])

  return (
    <div className="erp-doc-tools">
      <ToolLeaveGuard active={pages.length > 0} />
      <div className="erp-doc-tools__main">
        {pages.length === 0 ? (
          <DropZone loading={workspace.loading} onFiles={(files) => void handleFiles(files)} />
        ) : (
          <>
            <DocToolbar
              pageCount={pages.length}
              selectedCount={selected.length}
              canUndo={workspace.canUndo}
              canRedo={workspace.canRedo}
              loading={workspace.loading}
              onAddFiles={() => void pickAndAdd()}
              onInsert={handleInsert}
              onReplace={() => void handleReplace()}
              onRotate={workspace.rotate}
              onDuplicate={workspace.duplicate}
              combinable={workspace.combinable}
              onCombine={handleCombine}
              onCleanScan={handleCleanScan}
              onRemove={remove}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onUndo={undo}
              onRedo={redo}
              onReset={workspace.reset}
            />
            {suggestHiddenFor !== sessionKey ? (
              <SuggestionBar
                suggestions={suggestions}
                disabled={exporter.busy !== null}
                onRun={runSuggestion}
                onDismiss={() => setSuggestHiddenFor(sessionKey)}
              />
            ) : null}
            <div className="erp-doc-tools__body">
              <PageGrid
                pages={pages}
                sources={workspace.sources}
                stamp={stamp}
                hitCounts={hitCounts}
                selected={selected}
                onSelect={workspace.select}
                onPreview={setPreviewId}
                onShift={workspace.shift}
                onMove={workspace.move}
                onDropFiles={(files, placement) => void handleFiles(files, placement)}
              />
              <DocSidePanel
                activeTab={activeTab}
                onTabChange={setSideTab}
                formPending={form.pending}
                formPanel={hasForms ? <FormFillPanel form={form} onApply={() => void handleFormApply()} /> : null}
                decorationCount={Number(!!resolved.headerFooter) + Number(!!resolved.watermark)}
                searchPanel={
                  <SearchPanel
                    search={search}
                    replace={replace}
                    inputRef={searchInput}
                    onOpenHit={openHit}
                    onStep={stepHit}
                    ocrRunning={ocr.running}
                    ocrSection={
                      <OcrSection
                        state={ocr.state}
                        selectedCount={selected.length}
                        disabled={pages.length === 0}
                        onRun={() => void ocr.run(selected.length > 0 ? pages.filter((page) => selected.includes(page.id)) : pages)}
                        onCancel={ocr.cancel}
                      />
                    }
                  />
                }
                exportPanel={
                  <ExportPanel
                    pages={pages}
                    selected={selected}
                    name={exportName}
                    defaultName={defaultName}
                    onNameChange={setExportName}
                    busy={exporter.busy}
                    progress={exporter.progress}
                    onCancel={exporter.cancel}
                    onExportPdf={(scoped, name, output) => void exporter.exportPdf(scoped, name, output).then(afterExport('pdf'))}
                    onSplit={(groups, name, output) => void exporter.splitPdf(groups, name, output).then(afterExport('split'))}
                    onExportImages={(scoped, format, dpi, name) => void exporter.exportImages(scoped, format, dpi, name).then(afterExport('image'))}
                    onExportOffice={(kind, scoped, name) => void exporter.exportOffice(kind, scoped, name).then(afterExport(kind))}
                    onExportBatch={(groups, format, options, name) => void exporter.exportBatch(groups, format, options, name).then(afterExport('batch'))}
                    sources={workspace.sources}
                    nudge={nudge?.key === sessionKey ? nudge.kind : null}
                    onDismissNudge={() => {
                      setNudge(null)
                      setNudgeDismissed(true)
                    }}
                    sheetFields={
                      workspace.hasImagePages ? (
                        <ImageSheetFields sheet={workspace.imageSheet} disabled={sheetBusy || exporter.busy !== null} onChange={(sheet) => void handleSheet(sheet)} />
                      ) : null
                    }
                  />
                }
                decorationPanel={
                  <DecorationPanel decorations={decorations} errors={resolved.errors} onChange={workspace.setDecorations} />
                }
              />
            </div>
            <ExportJump pageCount={pages.length} onJump={jumpToPanel} />
          </>
        )}
      </div>

      {previewPage && previewSource ? (
        <PagePreviewModal
          page={previewPage}
          source={previewSource}
          position={previewIndex + 1}
          total={pages.length}
          stamp={stamp}
          hits={previewHits}
          activeHitId={search.activeHit?.id ?? null}
          hitPosition={search.hits.length > 0 ? { index: search.activeIndex, total: search.hits.length } : null}
          onHitStep={stepHit}
          canUndo={workspace.canUndo}
          canRedo={workspace.canRedo}
          onMarkupsChange={(markups) => workspace.setMarkups(previewPage.id, markups)}
          onCrop={(area) => handleCrop(previewPage.id, area)}
          onRewriteText={(request) => handleRewriteText(previewPage.id, request)}
          onUndo={undo}
          onRedo={redo}
          onPrev={previewIndex > 0 ? () => setPreviewId(pages[previewIndex - 1].id) : null}
          onNext={previewIndex < pages.length - 1 ? () => setPreviewId(pages[previewIndex + 1].id) : null}
          onClose={() => setPreviewId(null)}
        />
      ) : null}

      {unlock.current ? (
        <UnlockPdfModal
          key={`${unlock.remaining}-${unlock.current.name}`}
          file={unlock.current}
          remaining={unlock.remaining}
          busy={unlock.busy}
          onSubmit={unlock.submit}
          onSkip={unlock.skip}
        />
      ) : null}

      {scan.phase ? <ScanCleanupModal cleanup={scan} sources={workspace.sources} pageCount={pages.length} onApply={() => void handleScanApply()} /> : null}

      {pendingReplace ? (
        <ReplacePageModal
          source={pendingReplace.source}
          targetPosition={pendingReplace.position}
          onCancel={() => setPendingReplace(null)}
          onConfirm={(pageIndex) => {
            workspace.commitReplacement(pendingReplace.source, pageIndex, pendingReplace.targetId)
            setPendingReplace(null)
          }}
        />
      ) : null}
    </div>
  )
}
