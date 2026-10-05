import type { StatusMeta } from '@/components/common'
import { TRACE_STATUS } from '../types/trace.types'

/** Nhãn + tông của trạng thái mã; `StatusTag` tự gắn icon theo tông. */
export const TRACE_STATUS_META: Record<string, StatusMeta> = {
  [TRACE_STATUS.draft]: { label: 'Chưa phát hành', tone: 'neutral' },
  [TRACE_STATUS.active]: { label: 'Đang dùng', tone: 'success' },
  [TRACE_STATUS.expired]: { label: 'Đã hết hạn', tone: 'warning' },
  [TRACE_STATUS.suspended]: { label: 'Tạm khoá', tone: 'warning' },
  [TRACE_STATUS.revoked]: { label: 'Đã thu hồi', tone: 'danger' },
  [TRACE_STATUS.replaced]: { label: 'Đã thay mã', tone: 'info' },
  [TRACE_STATUS.archived]: { label: 'Đã lưu trữ', tone: 'neutral' },
}

/** Câu giải thích đi kèm trạng thái không dùng bình thường được (spec mục 15). */
export const TRACE_STATUS_NOTE: Partial<Record<string, string>> = {
  [TRACE_STATUS.expired]: 'Mã đã quá hạn — chỉ xem lịch sử, không thao tác.',
  [TRACE_STATUS.suspended]: 'Mã đang tạm khoá — không dùng cho nghiệp vụ.',
  [TRACE_STATUS.revoked]: 'Mã đã thu hồi — nhãn này không còn giá trị.',
  [TRACE_STATUS.replaced]: 'Nhãn này đã được thay — dùng nhãn mới.',
  [TRACE_STATUS.archived]: 'Đối tượng đã ngừng quản lý.',
}
