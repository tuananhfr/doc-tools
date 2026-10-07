export type LegalSlug = 'dieu-khoan' | 'quyen-rieng-tu'

/** Id đoạn văn, gạch đầu dòng theo thứ tự hiển thị; chữ ở `legal:<slug>.sections.<id>`. */
export interface LegalSection {
  id: string
  paragraphs?: readonly string[]
  items?: readonly string[]
  link?: { to: string }
}

export interface LegalDocument {
  summary: readonly string[]
  sections: readonly LegalSection[]
}

/** Chữ của một văn bản, đọc từ `legal:<slug>`. `title` có thẻ `<accent>` cho phần tô màu. */
export interface LegalText {
  title: string
  breadcrumb: string
  intro: string
  summary: Record<string, string>
  sections: Record<string, { heading: string; paragraphs?: Record<string, string>; items?: Record<string, string>; link?: string }>
}

export const LEGAL_UPDATED = '06/10/2026'

/**
 * Mục "dữ liệu xử lý" và "thời gian lưu" mô tả đúng code hiện tại (đếm lượt,
 * băm IP, góp ý có đồng ý). Đổi luồng dữ liệu là phải sửa chính sách (`messages/vi/legal.json`)
 * trước khi phát hành: Luật 91/2025/QH15 coi thông báo sai là xử lý không hợp pháp.
 */
export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  'dieu-khoan': {
    summary: ['free', 'yours', 'reference', 'lawful'],
    sections: [
      { id: 'dich-vu', paragraphs: ['free', 'changes'] },
      { id: 'tep-cua-ban', paragraphs: ['ownership', 'responsibility'] },
      { id: 'tham-khao', paragraphs: ['intro'], items: ['estimates', 'orientation', 'ocr'] },
      { id: 'hanh-vi-cam', items: ['unlawful', 'unauthorized', 'abuse', 'content'] },
      { id: 'gop-y', paragraphs: ['use'] },
      { id: 'so-huu-tri-tue', paragraphs: ['ownership'] },
      { id: 'lien-ket', paragraphs: ['external'] },
      { id: 'trach-nhiem', paragraphs: ['asIs', 'consumer'] },
      { id: 'quyen-rieng-tu', paragraphs: ['policy'], link: { to: '/quyen-rieng-tu' } },
      { id: 'thay-doi', paragraphs: ['updates'] },
      { id: 'luat-ap-dung', paragraphs: ['law'] },
      { id: 'lien-he', paragraphs: ['contact'] },
    ],
  },
  'quyen-rieng-tu': {
    summary: ['device', 'noTracking', 'counting', 'feedback'],
    sections: [
      { id: 'chung-toi', paragraphs: ['controller'] },
      { id: 'nguyen-tac', items: ['device', 'minimal', 'anonymous', 'noTracking'] },
      { id: 'du-lieu', items: ['visits', 'ip', 'feedback', 'logs'] },
      { id: 'tren-thiet-bi', paragraphs: ['local'], link: { to: '/xu-ly-du-lieu' } },
      { id: 'ben-thu-ba', paragraphs: ['noSale', 'speech'] },
      { id: 'thoi-gian-luu', items: ['ip', 'counts', 'feedback'] },
      { id: 'quyen', paragraphs: ['intro'], items: ['informed', 'consent', 'access', 'complain', 'protection'] },
      { id: 'thuc-hien-quyen', paragraphs: ['request', 'timeline'] },
      { id: 'tre-em', paragraphs: ['children'] },
      { id: 'bao-mat', paragraphs: ['security'] },
      { id: 'thay-doi', paragraphs: ['updates'] },
      { id: 'lien-he', paragraphs: ['contact'] },
    ],
  },
}
