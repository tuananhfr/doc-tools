import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ToolFlow,
  toolPathOf,
  useDownloadNudge,
  useFlowRun,
  useToolsBranch,
  type FlowFile,
  type FlowOutput,
  type FlowTask,
  type PickerCopy,
} from '@/features/tools/hub'
import type { QuickKind, QuickSources } from '../../hooks/useQuickSources'
import { handOffFiles } from '../../services/handoff'
import { useToolOrigin } from '@/features/tools/hub/hooks/useToolOrigin'
import { UnlockPdfModal } from '../UnlockPdfModal'
import { PdfSourcePreview } from './PdfSourcePreview'
import type { PdfStudioKind } from './PdfQuickStudio'
import { ConvertedFilePreview } from './ConvertedFilePreview'

interface QuickToolShellProps {
  imageStudio?: boolean
  conversionStudio?: 'ocr' | 'images' | 'imageText'
  pdfStudio?: PdfStudioKind
  resultKey?: string
  quick: QuickSources
  accept: readonly QuickKind[]
  multiple: boolean
  /** "Chọn các tệp PDF cần ghép". */
  pickerTitle: string
  /** Thứ tự tệp quyết định kết quả (ghép, ảnh → PDF) → hiện số thứ tự và nút dời. */
  reorder?: boolean
  /** Đường vào khác ngoài chọn tệp (chụp ảnh): nhận hàm thêm tệp, trả về nút đặt cạnh nút chọn tệp. */
  pickerExtra?: (addFiles: (files: File[]) => void) => ReactNode
  /** Vùng làm việc trên trang (lưới trang, khung che) — có thì thay cho danh sách tệp. Nhận cờ "đang chạy" để khoá thao tác. */
  stage?: (running: boolean) => ReactNode
  options?: ReactNode | ((running: boolean) => ReactNode)
  sideIntro?: ReactNode
  waitingLabel?: string
  runLabel: string
  runIcon: string
  /** Vì sao chưa chạy được với tệp / tuỳ chọn hiện tại; null = chạy được. */
  blocked: string | null
  /** Dựng việc cần chạy từ tệp + tuỳ chọn LÚC BẤM. */
  task: () => FlowTask
  mobilePreview?: boolean
}

const PDF_MIME = 'application/pdf'

const PICKER: Record<QuickKind | 'pdf+image', Pick<PickerCopy, 'accept'> & { hint: 'pdf' | 'image' | 'pdfImage' }> = {
  pdf: { accept: '.pdf,application/pdf', hint: 'pdf' },
  image: { accept: '.jpg,.jpeg,.png,image/jpeg,image/png', hint: 'image' },
  'pdf+image': { accept: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png', hint: 'pdfImage' },
}

/**
 * Phần chung của mọi công cụ nhanh: nối tệp đã chọn (`useQuickSources`) với
 * khung luồng của "Chuyện Nhỏ", hỏi mật khẩu PDF, mời khách đăng nhập sau khi
 * tải, và "Sửa tiếp" sang trình chỉnh sửa. Trang công cụ chỉ còn khai tuỳ chọn
 * và việc cần chạy.
 */
export function QuickToolShell({ quick, accept, multiple, pickerTitle, reorder, pickerExtra, stage, options, sideIntro, waitingLabel, runLabel, runIcon, blocked, task, mobilePreview, imageStudio, pdfStudio, resultKey, conversionStudio }: QuickToolShellProps) {
  const { t } = useTranslation('pdf')
  const { t: layout } = useTranslation('image', { keyPrefix: 'extendedStudio.layout' })
  const { t: pdfLayout } = useTranslation('pdf', { keyPrefix: 'quickStudio.layout' })
  const { t: conversion } = useTranslation('pdf', { keyPrefix: 'conversionStudio' })
  const { t: workflow } = useTranslation('pdf', { keyPrefix: 'workflowStudio' })
  const navigate = useNavigate()
  const { capture } = useToolOrigin()
  const { base } = useToolsBranch()
  const run = useFlowRun()
  useEffect(() => { if (resultKey !== undefined) run.reset() }, [resultKey, run.reset])
  const nudge = useDownloadNudge()
  const { unlock } = quick
  const previewSource = imageStudio ? quick.items[0]?.source : undefined
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    if (previewSource?.kind !== 'image') {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(new Blob([previewSource.bytes], { type: previewSource.mime }))
    setPreview({ id: previewSource.id, url })
    return () => URL.revokeObjectURL(url)
  }, [previewSource])

  const files: FlowFile[] = quick.items.map(({ source, pages }) => ({
    id: source.id,
    name: source.name,
    size: source.size,
    icon: source.kind === 'pdf' ? 'file-earmark-pdf' : 'file-earmark-image',
    detail: source.kind === 'pdf' ? t('stage.pageCount', { count: pages.length }) : t('stage.image'),
    thumbnail: quick.thumbnails[source.id],
  }))

  // Lỗi của lượt chạy trước nói về bộ tệp cũ — đổi tệp là hết đúng.
  const clearError = () => {
    if (run.state.phase === 'idle' && run.state.error) run.reset()
  }

  const addFiles = (added: File[]) => {
    clearError()
    void quick.addFiles(added)
  }

  const result = run.state.phase === 'done' ? run.state.result : null
  // Trình chỉnh sửa chỉ mở được PDF và ảnh; .zip / .docx / .txt không có gì để "sửa tiếp".
  const editable = result?.output.blob.type === PDF_MIME

  const editFurther = (output: FlowOutput) => {
    handOffFiles([new File([output.blob], output.name, { type: PDF_MIME })])
    navigate(toolPathOf(base, 'edit-pdf'), { state: capture() })
  }

  const picker = PICKER[accept.length > 1 ? 'pdf+image' : accept[0]]
  const scan = Boolean(conversionStudio) || pdfStudio === 'convert'
  const recognize = conversionStudio === 'ocr' || conversionStudio === 'imageText'
  const decorate = pdfStudio === 'numbers' || pdfStudio === 'stamp'
  const canvas = pdfStudio === 'organize' || pdfStudio === 'redact' || pdfStudio === 'sign'
  const compare = pdfStudio === 'compare'
  const running = run.state.phase === 'running'
  const workspace = scan || pdfStudio ? {
    mode: canvas ? 'canvas' as const : recognize ? 'ocr' as const : 'process' as const,
    inputTitle: pdfStudio === 'redact' ? workflow('redactInput') : pdfStudio === 'sign' ? workflow('signInput') : canvas ? workflow('organizeInput') : conversionStudio === 'imageText' ? workflow('imageTextInput') : recognize ? workflow('ocrInput') : pdfLayout('input'),
    optionsTitle: pdfStudio === 'redact' ? workflow('redactOptions') : pdfStudio === 'sign' ? workflow('signOptions') : canvas ? workflow('organizeOptions') : recognize ? workflow('ocrOptions') : conversionStudio === 'images' ? workflow('imageOptions') : scan ? conversion('optionsTitle') : pdfLayout('options'),
    previewTitle: compare ? workflow('comparePreview') : scan || decorate ? conversion('previewTitle') : pdfLayout('preview'),
    emptyTitle: pdfLayout('empty'),
    emptyHint: pdfStudio === 'redact' ? workflow('redactHint') : pdfStudio === 'sign' ? workflow('signHint') : canvas ? workflow('organizeHint') : compare ? workflow('compareHint') : decorate ? workflow('decorationHint') : scan ? conversion('sourceHint') : pdfLayout('hint'),
    preview: compare ? <div className="cn-compare-pair">{[0, 1].map(index => <section key={index}><h3>{index === 0 ? workflow('oldDocument') : workflow('newDocument')}</h3><PdfSourcePreview items={quick.items[index] ? [quick.items[index]] : []} /></section>)}</div> : decorate && quick.items.length ? stage?.(running) : <PdfSourcePreview items={quick.items} mixed={recognize} />,
    inlineResult: scan || decorate || compare ? { sourceLabel: compare ? workflow('sourcePair') : decorate ? workflow('editedPreview') : conversion('source'), resultLabel: compare ? workflow('compareReport') : decorate ? workflow('pdfResult') : conversion('result') } : undefined,
    resultPreview: scan ? (output: FlowOutput) => <ConvertedFilePreview output={output} /> : undefined,
  } : undefined

  return (
    <>
      <ToolFlow
        studio={workspace ?? (imageStudio ? { mode: 'ocr', inputTitle: layout('input'), optionsTitle: layout('options'), previewTitle: layout('preview'), emptyTitle: layout('empty'), emptyHint: layout('ocrHint'), previewUrl: preview?.id === previewSource?.id ? preview?.url : undefined } : undefined)}
        mobilePreview={mobilePreview}
        picker={{ accept: picker.accept, hint: t(`picker.${picker.hint}`), multiple, title: pickerTitle }}
        files={files}
        loading={quick.loading}
        rejected={quick.rejected}
        onDismissRejected={quick.dismissRejected}
        onAddFiles={addFiles}
        pickerExtra={pickerExtra?.(addFiles)}
        onRemove={(id) => {
          clearError()
          quick.remove(id)
        }}
        onMove={reorder ? quick.move : undefined}
        onClear={() => {
          clearError()
          quick.clear()
        }}
        stage={quick.items.length > 0 ? stage?.(run.state.phase === 'running') : undefined}
        options={typeof options === 'function' ? options(running) : options}
        sideIntro={sideIntro}
        waitingLabel={waitingLabel}
        runLabel={runLabel}
        runIcon={runIcon}
        blocked={quick.items.length === 0 ? t('picker.noFiles') : blocked}
        run={run}
        onRun={() => void run.start(task())}
        onEdit={editable ? editFurther : undefined}
        onDownloaded={nudge.onDownloaded}
        resultExtra={nudge.extra}
      />

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
    </>
  )
}
