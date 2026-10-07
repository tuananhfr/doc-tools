import type { ReactNode } from 'react'
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
import { UnlockPdfModal } from '../UnlockPdfModal'

interface QuickToolShellProps {
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
  options?: ReactNode
  runLabel: string
  runIcon: string
  /** Vì sao chưa chạy được với tệp / tuỳ chọn hiện tại; null = chạy được. */
  blocked: string | null
  /** Dựng việc cần chạy từ tệp + tuỳ chọn LÚC BẤM. */
  task: () => FlowTask
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
export function QuickToolShell({ quick, accept, multiple, pickerTitle, reorder, pickerExtra, stage, options, runLabel, runIcon, blocked, task }: QuickToolShellProps) {
  const { t } = useTranslation('pdf')
  const navigate = useNavigate()
  const { base } = useToolsBranch()
  const run = useFlowRun()
  const nudge = useDownloadNudge()
  const { unlock } = quick

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
    navigate(toolPathOf(base, 'edit-pdf'))
  }

  const picker = PICKER[accept.length > 1 ? 'pdf+image' : accept[0]]

  return (
    <>
      <ToolFlow
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
        options={options}
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
