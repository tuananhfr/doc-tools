import { HUB_PAGE_LIST } from './hub-pages'

export interface SitePageMeta {
  title: string
  description: string
}

/** Trang nội dung một cột; tiêu đề dùng chung cho thẻ `<title>` của Next và tab khi điều hướng phía client. */
export const SITE_PAGE_META = {
  've-chung-toi': {
    title: 'Về Chuyện Nhỏ | Công cụ miễn phí từ ERPCons & LPC',
    description: 'Chuyện Nhỏ là bộ công cụ miễn phí từ ERPCons & LPC, giúp xử lý nhanh việc nhỏ trong công việc, xây dựng và cuộc sống hằng ngày.',
  },
  'ho-tro': {
    title: 'Hỗ trợ & câu hỏi thường gặp | Chuyện Nhỏ',
    description: 'Câu trả lời cho những thắc mắc thường gặp khi dùng Chuyện Nhỏ, và cách liên hệ với chúng tôi.',
  },
  'xu-ly-du-lieu': {
    title: 'Cách chúng tôi xử lý dữ liệu | Chuyện Nhỏ',
    description: 'Công cụ nào xử lý ngay trên thiết bị, công cụ nào cần máy chủ, và dữ liệu nào được lưu. Minh bạch cho từng công cụ.',
  },
  'cai-dat': {
    title: 'Cài Chuyện Nhỏ trên điện thoại và máy tính | Chuyện Nhỏ',
    description: 'Thêm Chuyện Nhỏ vào màn hình chính Android, iPhone, iPad hoặc cài trên Windows, macOS để mở nhanh như một ứng dụng.',
  },
  'huong-dan': {
    title: 'Hướng dẫn sử dụng | Chuyện Nhỏ',
    description: 'Hướng dẫn từng bước cho các công cụ hay dùng: nén PDF, scan ảnh sang PDF, OCR, mã QR, hướng nhà, khái toán, Lịch Gia Đình.',
  },
  'dieu-khoan': {
    title: 'Điều khoản sử dụng | Chuyện Nhỏ',
    description: 'Điều khoản sử dụng bộ công cụ miễn phí Chuyện Nhỏ.',
  },
  'quyen-rieng-tu': {
    title: 'Chính sách quyền riêng tư | Chuyện Nhỏ',
    description: 'Chuyện Nhỏ thu thập, sử dụng và bảo vệ dữ liệu cá nhân như thế nào, theo Luật Bảo vệ dữ liệu cá nhân 2025.',
  },
} as const satisfies Record<string, SitePageMeta>

export type SitePageSlug = keyof typeof SITE_PAGE_META

/**
 * Trang của site nằm cùng tầng với slug công cụ (`/<slug>`). Route tĩnh thắng
 * `:tool`, nên trùng slug là công cụ đó mất đường vào mà không lỗi nào báo;
 * test giữ hai danh sách tách nhau. Thêm trang mới: khai ở đây, ở `app/<slug>/page.tsx`
 * và trong `runtime/ToolsRouter.tsx`.
 */
export const SITE_PAGE_SLUGS: readonly string[] = ['cong-cu', ...HUB_PAGE_LIST.map((page) => page.slug), ...Object.keys(SITE_PAGE_META)]
