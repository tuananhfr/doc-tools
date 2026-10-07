import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolFlow, useDownloadNudge, type FlowFile, type FlowRun, type FlowTask } from '@/features/tools/hub'
import type { ImageFiles } from '../hooks/useImageFiles'
import { sizeLabel } from '../utils/image-format'

interface ImageToolShellProps {
  images: ImageFiles
  /** Lượt chạy do trang giữ: trang cắt / đo cần biết đang ở bước nào để khoá vùng làm việc. */
  run: FlowRun
  multiple: boolean
  /** "Chọn ảnh cần nén". */
  pickerTitle: string
  /** Vùng làm việc riêng (cắt, đo) — có thì thay cho danh sách ảnh. */
  stage?: ReactNode
  options?: ReactNode
  runLabel: string
  runIcon: string
  /** Vì sao chưa chạy được với ảnh / tuỳ chọn hiện tại; null = chạy được. */
  blocked: string | null
  /** Dựng việc cần chạy từ ảnh + tuỳ chọn LÚC BẤM. */
  task: () => FlowTask
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

/**
 * Phần chung của các công cụ ảnh: nối ảnh đã chọn (`useImageFiles`) với khung
 * luồng của "Chuyện Nhỏ" và mời khách đăng nhập sau khi tải. Trang công cụ chỉ
 * còn khai tuỳ chọn, vùng làm việc và việc cần chạy.
 */
export function ImageToolShell({ images, run, multiple, pickerTitle, stage, options, runLabel, runIcon, blocked, task }: ImageToolShellProps) {
  const { t } = useTranslation('image')
  const nudge = useDownloadNudge()

  const files: FlowFile[] = images.items.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    icon: 'file-earmark-image',
    detail: sizeLabel(item),
    thumbnail: item.thumbnail ?? undefined,
  }))

  // Lỗi của lượt chạy trước nói về bộ ảnh cũ — đổi ảnh là hết đúng.
  const clearError = () => {
    if (run.state.phase === 'idle' && run.state.error) run.reset()
  }

  return (
    <ToolFlow
      picker={{ accept: ACCEPT, hint: t('shell.hint'), multiple, title: pickerTitle }}
      files={files}
      loading={images.loading}
      rejected={images.rejected}
      onDismissRejected={images.dismissRejected}
      onAddFiles={(added) => {
        clearError()
        void images.addFiles(added)
      }}
      onRemove={(id) => {
        clearError()
        images.remove(id)
      }}
      onClear={() => {
        clearError()
        images.clear()
      }}
      stage={stage}
      options={options}
      runLabel={runLabel}
      runIcon={runIcon}
      blocked={images.items.length === 0 ? t('shell.noImages') : blocked}
      run={run}
      onRun={() => void run.start(task())}
      onDownloaded={nudge.onDownloaded}
      resultExtra={nudge.extra}
    />
  )
}
