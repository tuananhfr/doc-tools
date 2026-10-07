export type FaqId = 'mien-phi' | 'tai-khoan' | 'luu-tep' | 'may-chu' | 'cai-dat' | 'offline' | 'loi' | 'an-toan' | 'thu-thap' | 'xoa-du-lieu' | 'ben-thu-ba' | 'de-xuat'
export type FaqLinkId = 'processingPerTool' | 'installPerDevice' | 'dataHandling' | 'privacyPolicy' | 'suggest'

/** Một câu hỏi trong config; chữ ở `site:faq.items.<id>`, nhãn link ở `site:faq.links.<label>`. */
export interface FaqEntry {
  id: FaqId
  link?: { to: string; label: FaqLinkId }
}

/** Câu hỏi đã gắn chữ của ngôn ngữ đang xem. */
export interface FaqItem {
  id: string
  question: string
  /** Văn bản thuần: dùng lại nguyên văn cho JSON-LD FAQPage. */
  answer: string
  link?: { to: string; label: string }
}

/**
 * Câu trả lời về dữ liệu phải khớp code (đếm lượt, góp ý, lưu trên trình duyệt);
 * đổi luồng dữ liệu thì sửa cả đây, `/xu-ly-du-lieu` và `/quyen-rieng-tu`.
 */
export const FAQ_ITEMS: readonly FaqEntry[] = [
  { id: 'mien-phi' },
  { id: 'tai-khoan' },
  { id: 'luu-tep' },
  { id: 'may-chu', link: { to: '/xu-ly-du-lieu', label: 'processingPerTool' } },
  { id: 'cai-dat', link: { to: '/cai-dat', label: 'installPerDevice' } },
  { id: 'offline' },
  { id: 'loi' },
  { id: 'an-toan', link: { to: '/xu-ly-du-lieu', label: 'dataHandling' } },
  { id: 'thu-thap', link: { to: '/quyen-rieng-tu', label: 'privacyPolicy' } },
  { id: 'xoa-du-lieu' },
  { id: 'ben-thu-ba' },
  { id: 'de-xuat', link: { to: '/de-xuat-tien-ich', label: 'suggest' } },
]

/** Câu hỏi lặp lại ở cuối trang "Cách xử lý dữ liệu". */
export const DATA_FAQ_IDS = ['thu-thap', 'luu-tep', 'may-chu', 'xoa-du-lieu', 'ben-thu-ba', 'offline'] as const
