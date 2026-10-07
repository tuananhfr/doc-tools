import { appConfig } from '@/config/app.config'
import type { ToolCategory, ToolEntry, ToolFilter, ToolScreen, ToolTone } from '../types/tool.types'
import { enabledTools } from '../utils/tool-registry'
import { ALL_TOOLS } from './tool-list'

/**
 * Danh mục đang chạy = mọi công cụ trừ những cái bị tắt bằng cờ
 * (`VITE_TOOLS_OFF=ocr,qr-read`). Công cụ bị tắt mất cả thẻ lẫn đường vào — gỡ
 * được một công cụ đang lỗi khỏi bản production mà không phải sửa code.
 *
 * Chưa có chữ: màn hiển thị lấy danh mục đã gắn ngôn ngữ qua `useToolCatalog()`.
 */
export const TOOL_CATALOG: ToolEntry[] = enabledTools(ALL_TOOLS, appConfig.toolsOff)

/**
 * Màn nào chạy bằng pdf.js — khai theo MÀN chứ không theo công cụ, vì hai công
 * cụ chung một màn (Xem PDF ↔ Chỉnh sửa PDF) không thể lệch nhau.
 *
 * `ToolRoutePage` hỏi `pdfEngineSupported()` trước khi nạp các màn này; trình
 * duyệt quá cũ thì hiện thông báo thay vì nạp một chunk chắc chắn hỏng. Mọi
 * màn của `tools/pdf` đều kéo pdf.js qua import tĩnh (kể cả Ảnh → Văn
 * bản và Scan ảnh → PDF, qua `quick-tasks` / `useUnlockQueue`) — thêm màn PDF
 * mới thì thêm vào đây.
 */
export const PDF_ENGINE_SCREENS: ReadonlySet<ToolScreen> = new Set<ToolScreen>([
  'editor',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'convert-file',
  'pdf-to-image',
  'organize-pdf',
  'page-numbers',
  'stamp-pdf',
  'redact-pdf',
  'sign-pdf',
  'compare-pdf',
  'ocr',
  'image-to-text',
  'images-to-pdf',
])

/** Mọi nhóm, theo thứ tự trên hàng lọc; nhãn ở `catalog:groups.<nhóm>`. */
const TOOL_GROUPS: readonly ToolCategory[] = ['document', 'image', 'calc', 'money', 'date', 'data', 'construction', 'home', 'tech', 'other']

/**
 * Chip của hàng lọc: chỉ nhóm đã có công cụ (kể cả "Sắp có"). Chip dẫn tới lưới
 * trống trông như lỗi — gắn công cụ đầu tiên vào nhóm nào thì chip nhóm đó tự hiện.
 */
export const TOOL_FILTERS: readonly ToolFilter[] = [
  'all',
  ...TOOL_GROUPS.filter((group) => TOOL_CATALOG.some((tool) => tool.categories.includes(group))),
]

/**
 * Màu ô icon theo NHÓM chứ không theo từng công cụ: mẫu thiết kế tô mỗi thẻ một
 * màu, nhưng Crimson Ice chỉ có bảy tông mang nghĩa — tự chế thêm (tím) là phá
 * bảng màu, còn tô ngẫu nhiên là màu không còn nói lên điều gì.
 *
 * Mười nhóm, sáu tông: `money` đi chung với `calc` (cùng là phép tính), `tech`
 * với `other`, `date` với `document`, `construction` với `home` (cùng là chuyện
 * nhà cửa, công trình). Không nhóm nào mang `brand`: Tài liệu chiếm
 * nửa lưới, mà crimson chỉ dành cho identity / CTA (~2% diện tích).
 */
export const CATEGORY_TONE: Record<ToolCategory, ToolTone> = {
  document: 'info',
  image: 'construction',
  calc: 'intelligence',
  money: 'intelligence',
  date: 'info',
  data: 'success',
  construction: 'warning',
  home: 'warning',
  tech: 'neutral',
  other: 'neutral',
}

/** Link `?tool=` phát ra trước khi mỗi công cụ có đường dẫn riêng. */
export const LEGACY_TOOL_QUERY: Record<string, string> = {
  merge: 'ghep-pdf',
  split: 'tach-pdf',
  'image-to-pdf': 'anh-sang-pdf',
  'pdf-to-word': 'pdf-sang-word',
}

/** Mẹo ở cột phải (`catalog:tips.<khoá>`) — chỉ viết việc trình chỉnh sửa làm được thật. */
export const HUB_TIP_KEYS = ['insertPages', 'findInScan', 'undo', 'rangeSelect'] as const
