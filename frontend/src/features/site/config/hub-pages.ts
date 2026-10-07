import type { HubPage, HubPageSlug } from '../types/hub-page.types'

/**
 * Ba trang nhóm theo mockup. Thẻ lấy từ danh mục bằng id, nên trạng thái
 * "Dùng ngay / Sắp có" và nơi xử lý luôn khớp `tool-list.ts`, không ghi lại ở đây.
 * Một công cụ được nằm ở nhiều nhóm con; lưới "Tất cả" tự bỏ trùng.
 * Chữ ở `site:hubs.<slug>`, khoá theo id khai ở đây.
 */
export const HUB_PAGES: Record<HubPageSlug, HubPage> = {
  'xay-dung': {
    slug: 'xay-dung',
    art: { kind: 'image', src: '/brand/skyline-hero-v1.png', width: 1792, height: 896 },
    highlights: ['estimate', 'planning', 'prices', 'legal', 'standards', 'dossier', 'site'],
    trust: [
      { id: 'free', icon: 'gift' },
      { id: 'noInstall', icon: 'lightning-charge' },
      { id: 'onDevice', icon: 'shield-check' },
      { id: 'practical', icon: 'heart' },
    ],
    subgroups: [
      { id: 'khai-toan', toolIds: ['house-estimate', 'structure-calc'] },
      { id: 'quy-hoach', toolIds: ['planning-lookup', 'house-orientation'] },
      { id: 'gia-vat-lieu', toolIds: ['construction-price', 'supplier-lookup'] },
      { id: 'phap-ly', toolIds: ['construction-law', 'construction-standards'] },
      { id: 'ban-ve', toolIds: ['measure-image', 'dossier-check', 'drawing-convert', 'drawing-area'] },
      { id: 'hien-truong', toolIds: ['site-diary'] },
    ],
    aside: [
      { kind: 'product', id: 'erpcons', product: 'erpcons', points: ['work', 'cost', 'documents', 'ai'] },
      { kind: 'product', id: 'tekshot', product: 'tekshot', points: ['vision', 'studio', 'insight', 'central'] },
      { kind: 'support' },
    ],
    journey: {
      flow: true,
      steps: [
        { id: 'idea', icon: 'lightbulb' },
        { id: 'design', icon: 'rulers' },
        { id: 'estimate', icon: 'calculator' },
        { id: 'build', icon: 'cone-striped' },
        { id: 'handover', icon: 'house-check' },
      ],
    },
  },

  'gia-dinh': {
    slug: 'gia-dinh',
    art: { kind: 'icon', icon: 'house-heart' },
    highlights: ['calendar', 'reminders', 'spending', 'together'],
    trust: [
      { id: 'free', icon: 'heart' },
      { id: 'noInstall', icon: 'lightning-charge' },
      { id: 'private', icon: 'shield-check' },
      { id: 'devices', icon: 'phone' },
    ],
    subgroups: [
      { id: 'lich', toolIds: ['family-calendar', 'lunar-calendar', 'family-reminders', 'special-days'] },
      { id: 'chi-tieu', toolIds: ['electricity', 'group-split', 'family-budget'] },
      { id: 'nha-cua', toolIds: ['house-orientation', 'house-chores'] },
      { id: 'hoc-tap', toolIds: ['flashcards', 'study'] },
      { id: 'suc-khoe', toolIds: ['family-health'] },
      { id: 'ket-noi', toolIds: ['family-share', 'family-album'] },
    ],
    aside: [
      { kind: 'spotlight', id: 'familyCalendar', toolId: 'family-calendar', points: ['schedules', 'contacts', 'backup', 'ics'] },
      { kind: 'spotlight', id: 'houseOrientation', toolId: 'house-orientation', points: ['direction', 'compass', 'lookup'] },
      { kind: 'support' },
    ],
    journey: {
      flow: false,
      steps: [
        { id: 'organized', icon: 'calendar-check' },
        { id: 'connected', icon: 'people' },
        { id: 'caring', icon: 'emoji-smile' },
        { id: 'happy', icon: 'star' },
      ],
    },
  },

  'tai-lieu-pdf': {
    slug: 'tai-lieu-pdf',
    art: { kind: 'image', src: '/brand/documents-hero-v1.png', width: 1280, height: 1280 },
    highlights: ['edit', 'mergeSplit', 'convert', 'sign', 'ocr', 'compare', 'redact'],
    trust: [
      { id: 'free', icon: 'gift' },
      { id: 'noInstall', icon: 'lightning-charge' },
      { id: 'secure', icon: 'shield-check' },
      { id: 'formats', icon: 'files' },
    ],
    subgroups: [
      { id: 'sua', toolIds: ['edit-pdf', 'view-pdf', 'organize-pdf', 'page-numbers', 'stamp-pdf'] },
      { id: 'gop-tach', toolIds: ['merge-pdf', 'split-pdf', 'compress-pdf'] },
      { id: 'chuyen-doi', toolIds: ['scan-to-pdf', 'convert-file', 'pdf-to-image'] },
      { id: 'ocr', toolIds: ['ocr', 'image-to-text', 'compare'] },
      { id: 'ky-bao-mat', toolIds: ['sign', 'pdf-password', 'redact-pdf'] },
      { id: 'soan-thao', toolIds: ['form-templates', 'cv'] },
    ],
    aside: [
      { kind: 'product', id: 'erpcons', product: 'erpcons', points: ['storage', 'permissions', 'versions', 'linked'] },
      { kind: 'tips', id: 'tips', items: ['drop', 'options', 'download', 'closeTab'] },
      { kind: 'privacy' },
      { kind: 'support' },
    ],
    journey: {
      flow: true,
      steps: [
        { id: 'documents', icon: 'file-earmark-pdf' },
        { id: 'storage', icon: 'folder2-open' },
        { id: 'share', icon: 'people' },
        { id: 'approve', icon: 'patch-check' },
        { id: 'track', icon: 'bar-chart' },
      ],
    },
  },
}

export const HUB_PAGE_LIST: HubPage[] = Object.values(HUB_PAGES)
