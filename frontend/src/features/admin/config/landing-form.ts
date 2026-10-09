/** Length caps mirror backend/src/landings/landing-content.ts; the server is the one that enforces them. */
export const LANDING_LIMITS = { short: 60, title: 120, body: 400, metaTitle: 70, metaDescription: 200, url: 300 } as const

export const LANDING_KEY_PATTERN = '[a-z0-9](?:[a-z0-9\\-]{0,38}[a-z0-9])?'

/** DocTools pages a use-case card may open besides a tool (backend LANDING_PAGE_TARGETS). */
export const LANDING_PAGE_TARGETS = [
  { value: 'cong-cu', label: 'Trang tất cả công cụ' },
  { value: 'tai-lieu-pdf', label: 'Trang tài liệu PDF' },
  { value: 'gia-dinh', label: 'Trang gia đình' },
  { value: 'xay-dung', label: 'Trang xây dựng' },
  { value: 'huong-dan', label: 'Trang hướng dẫn' },
] as const

export const LANDING_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'

/** Published pages are cached 60s here, then by the host site's own proxy. */
export const LANDING_DELAY_NOTE = 'Bản xuất bản hiện trên trang thật sau khoảng 1 phút, cộng thêm thời gian cache của website gắn trang (thường dưới 5 phút).'
