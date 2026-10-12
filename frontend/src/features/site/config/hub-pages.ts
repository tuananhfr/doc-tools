import type { HubPage, HubPageSlug } from '../types/hub-page.types'

/**
 * Trang nhóm theo spec v3 §02 (mỗi nhóm menu một trang). Thẻ lấy từ danh mục bằng id, nên trạng thái
 * "Dùng ngay / Sắp có" và nơi xử lý luôn khớp `tool-list.ts`, không ghi lại ở đây.
 * Một công cụ được nằm ở nhiều nhóm con; lưới "Tất cả" tự bỏ trùng.
 * Chữ ở `site:hubs.<slug>`, khoá theo id khai ở đây.
 */
export const HUB_PAGES: Record<HubPageSlug, HubPage> = {
  'kham-pha-giai-tri': {
    slug: 'kham-pha-giai-tri', art: { kind: 'icon', icon: 'stars' }, highlights: ['calendar', 'numbers', 'cards', 'tarot'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'source', icon: 'journal-check' }, { id: 'choice', icon: 'person-check' }, { id: 'reference', icon: 'info-circle' }],
    subgroups: [{ id: 'lich', toolIds: ['lunar-calendar'] }, { id: 'kham-pha', toolIds: ['numerology', 'playing-cards', 'tarot', 'spin-wheel'] }],
    aside: [{ kind: 'tips', id: 'usage', items: ['features', 'content', 'privacy'] }, { kind: 'support' }],
    journey: { flow: false, steps: [{ id: 'choose', icon: 'grid' }, { id: 'explore', icon: 'search' }, { id: 'source', icon: 'journal' }, { id: 'export', icon: 'download' }] },
  },
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
      { id: 'quy-hoach', toolIds: ['house-orientation'] },
      { id: 'gia-vat-lieu', toolIds: [] },
      { id: 'phap-ly', toolIds: [] },
      { id: 'ban-ve', toolIds: ['measure-image', 'drawing-convert', 'drawing-area'] },
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
      { id: 'lich', toolIds: ['lunar-calendar', 'family-reminders', 'special-days'] },
      { id: 'chi-tieu', toolIds: ['electricity', 'group-split', 'family-budget'] },
      { id: 'nha-cua', toolIds: ['house-orientation', 'house-chores'] },
      { id: 'hoc-tap', toolIds: ['flashcards', 'study'] },
      { id: 'suc-khoe', toolIds: ['family-health'] },
      { id: 'ket-noi', toolIds: ['family-share', 'family-album'] },
    ],
    aside: [
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

  'hinh-anh': {
    slug: 'hinh-anh', art: { kind: 'icon', icon: 'images' },
    highlights: ['convert', 'compress', 'crop', 'background', 'idPhoto', 'design'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'noInstall', icon: 'lightning-charge' }, { id: 'onDevice', icon: 'shield-check' }, { id: 'exif', icon: 'camera' }],
    subgroups: [
      { id: 'chinh-sua', toolIds: ['crop-image', 'compress-image', 'convert-image', 'batch-image', 'mark-image'] },
      { id: 'ghep-thiet-ke', toolIds: ['collage', 'quick-design', 'color'] },
      { id: 'nen-metadata', toolIds: ['remove-background', 'remove-metadata'] },
      { id: 'anh-the', toolIds: ['id-photo'] },
      { id: 'do-lay-chu', toolIds: ['measure-image', 'image-to-text'] },
    ],
    aside: [{ kind: 'tips', id: 'tips', items: ['originals', 'exif', 'batch'] }, { kind: 'privacy' }, { kind: 'support' }],
    journey: { flow: false, steps: [{ id: 'pick', icon: 'images' }, { id: 'edit', icon: 'sliders' }, { id: 'preview', icon: 'eye' }, { id: 'download', icon: 'download' }] },
  },

  'ma-qr': {
    slug: 'ma-qr', art: { kind: 'icon', icon: 'qr-code' },
    highlights: ['qr', 'barcode', 'scan', 'labels', 'vietqr', 'dynamic'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'noInstall', icon: 'lightning-charge' }, { id: 'onDevice', icon: 'shield-check' }, { id: 'consent', icon: 'person-check' }],
    subgroups: [
      { id: 'tao-ma', toolIds: ['qr-create', 'barcode-create', 'vietqr'] },
      { id: 'quet-ma', toolIds: ['qr-read'] },
      { id: 'qr-dong', toolIds: ['code-manager'] },
    ],
    aside: [{ kind: 'tips', id: 'tips', items: ['printTest', 'contrast', 'noAutoOpen'] }, { kind: 'support' }],
    journey: { flow: true, steps: [{ id: 'content', icon: 'pencil' }, { id: 'style', icon: 'palette' }, { id: 'check', icon: 'qr-code-scan' }, { id: 'print', icon: 'printer' }] },
  },

  'doc-va-nghe': {
    slug: 'doc-va-nghe', art: { kind: 'icon', icon: 'volume-up' },
    highlights: ['readAloud', 'dictation', 'magnifier'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'noInstall', icon: 'lightning-charge' }, { id: 'voices', icon: 'soundwave' }, { id: 'browser', icon: 'info-circle' }],
    subgroups: [
      { id: 'nghe', toolIds: ['read-aloud'] },
      { id: 'ghi', toolIds: ['dictation'] },
      { id: 'nhin-ro', toolIds: ['magnifier'] },
    ],
    aside: [{ kind: 'tips', id: 'tips', items: ['paste', 'speed', 'voice'] }, { kind: 'support' }],
    journey: { flow: false, steps: [{ id: 'paste', icon: 'clipboard' }, { id: 'listen', icon: 'play-circle' }, { id: 'adjust', icon: 'sliders' }] },
  },

  'tinh-toan': {
    slug: 'tinh-toan', art: { kind: 'icon', icon: 'calculator' },
    highlights: ['vat', 'percent', 'units', 'dates', 'area', 'loan'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'noInstall', icon: 'lightning-charge' }, { id: 'onDevice', icon: 'shield-check' }, { id: 'reference', icon: 'info-circle' }],
    subgroups: [
      { id: 'tien-thue', toolIds: ['money-calc', 'number-words', 'group-split', 'unit-price'] },
      { id: 'vay', toolIds: ['loan'] },
      { id: 'do-luong', toolIds: ['quick-calc', 'unit-convert'] },
      { id: 'ngay', toolIds: ['date-calc', 'lunar-calendar'] },
      { id: 'hoc-tap', toolIds: ['study'] },
    ],
    aside: [{ kind: 'tips', id: 'tips', items: ['check', 'vat', 'units'] }, { kind: 'support' }],
    journey: { flow: true, steps: [{ id: 'enter', icon: 'keyboard' }, { id: 'check', icon: 'list-check' }, { id: 'copy', icon: 'clipboard' }] },
  },

  'mau-giay-to': {
    slug: 'mau-giay-to', art: { kind: 'icon', icon: 'file-earmark-text' },
    highlights: ['cv', 'leave', 'authorization', 'handover', 'receipt'],
    trust: [{ id: 'free', icon: 'gift' }, { id: 'noInstall', icon: 'lightning-charge' }, { id: 'onDevice', icon: 'shield-check' }, { id: 'print', icon: 'printer' }],
    subgroups: [
      { id: 'cv', toolIds: ['cv'] },
      { id: 'don-bien-ban', toolIds: ['form-templates'] },
      { id: 'ho-tro-soan', toolIds: ['number-words', 'char-count', 'legacy-font'] },
    ],
    aside: [{ kind: 'tips', id: 'tips', items: ['check', 'numberWords', 'sign'] }, { kind: 'privacy' }, { kind: 'support' }],
    journey: { flow: true, steps: [{ id: 'choose', icon: 'grid' }, { id: 'fill', icon: 'pencil' }, { id: 'preview', icon: 'eye' }, { id: 'print', icon: 'printer' }] },
  },
}

export const HUB_PAGE_LIST: HubPage[] = Object.values(HUB_PAGES)
