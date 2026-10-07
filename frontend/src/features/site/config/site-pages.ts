import { HUB_PAGE_LIST } from './hub-pages'

/** Trang nội dung một cột; tiêu đề, mô tả ở `site:pages.<slug>`, dùng chung cho thẻ `<title>` của Next và tab khi điều hướng phía client. */
export const SITE_PAGES = ['ve-chung-toi', 'ho-tro', 'xu-ly-du-lieu', 'cai-dat', 'huong-dan', 'dieu-khoan', 'quyen-rieng-tu'] as const

export type SitePageSlug = (typeof SITE_PAGES)[number]

/**
 * Trang của site nằm cùng tầng với slug công cụ (`/<slug>`). Route tĩnh thắng
 * `:tool`, nên trùng slug là công cụ đó mất đường vào mà không lỗi nào báo;
 * test giữ hai danh sách tách nhau. Thêm trang mới: khai ở đây, ở `app/<slug>/page.tsx`
 * và trong `runtime/ToolsRouter.tsx`.
 */
export const SITE_PAGE_SLUGS: readonly string[] = ['cong-cu', ...HUB_PAGE_LIST.map((page) => page.slug), ...SITE_PAGES]
