import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { topTools } from '@/features/tools/hub/utils/tool-registry'

export const FEATURED_TOOLS = topTools(TOOL_CATALOG, 10)
export const READY_TOOL_COUNT = TOOL_CATALOG.filter((tool) => tool.status === 'ready').length
export const HOME_TITLE = 'Chuyện Nhỏ | Công cụ miễn phí. Cần là dùng.'
export const DIRECTORY_TITLE = 'Tất cả công cụ miễn phí | Chuyện Nhỏ'

export const HERO_PROMISES = ['Không cần tài khoản', 'Không cần cài đặt', 'Tệp xử lý trên thiết bị']
export const TRUST_ITEMS = [
  { icon: 'gift', title: 'Hoàn toàn miễn phí', description: 'Dùng ngay, không chi phí ẩn' },
  { icon: 'shield-check', title: 'Không cần tài khoản', description: 'Vào trang, chọn công cụ và dùng' },
  { icon: 'lightning-charge', title: 'Không cần cài đặt', description: 'Chạy ngay trong trình duyệt' },
  { icon: 'lock', title: 'Tệp ở trên thiết bị', description: 'Tệp của bạn không tải lên máy chủ' },
] as const
