import type { ToolEntry } from '../types/tool.types'

/**
 * Mọi công cụ của "Chuyện Nhỏ", theo đúng thứ tự trên lưới "tất cả".
 *
 * Tên, mô tả, từ đồng nghĩa nằm ở `i18n/messages/<ngôn ngữ>/catalog.json`
 * (`tools.<id>`). Mô tả phải nói ĐÚNG việc công cụ làm được hôm nay (OCR chỉ có
 * tiếng Việt, chuyển đổi ảnh không có HEIC) — thẻ hứa quá tay là người dùng thả
 * tệp vào rồi mới biết. Công cụ chưa làm mang `status: 'soon'`: có thẻ, không có đường vào.
 *
 * Bốn slug `ghep-pdf` · `tach-pdf` · `anh-sang-pdf` · `pdf-sang-word` đã phát
 * ra ngoài từ trước khi có trang này — không đổi.
 *
 * Tệp này CHỈ được có `import type`: plugin `shareMeta` (vite.config.ts) bỏ kiểu
 * rồi nạp nó bằng Node lúc build để sinh thẻ chia sẻ — một import chạy thật
 * (alias `@/`, đường dẫn không đuôi) là build vỡ. Thứ cần import nằm ở `tool-catalog.ts`.
 */
export const ALL_TOOLS: ToolEntry[] = [
  {
    id: 'compress-video', slug: 'nen-video', icon: 'file-earmark-play',
    categories: ['other'], status: 'ready', screen: 'compress-video',
  },
  {
    id: 'trim-video', slug: 'cat-video', icon: 'scissors',
    categories: ['other'], status: 'ready', screen: 'trim-video',
  },
  {
    id: 'video-gif', slug: 'tao-gif', icon: 'film',
    categories: ['other'], status: 'ready', screen: 'video-gif',
  },
  {
    id: 'extract-audio', slug: 'tach-am-thanh', icon: 'soundwave',
    categories: ['other'], status: 'ready', screen: 'extract-audio',
  },
  {
    id: 'assistant', slug: 'tro-ly', icon: 'chat-dots',
    categories: ['other'], noFile: true, status: 'ready', screen: 'assistant',
  },
  {
    id: 'idea-suggestion', slug: 'de-xuat-tien-ich', icon: 'lightbulb',
    categories: ['other'], noFile: true, status: 'ready', screen: 'idea-suggestion',
  },
  {
    id: 'regulation-feedback', slug: 'gop-y-quy-dinh', icon: 'chat-left-text',
    categories: ['data', 'other'], noFile: true, status: 'ready', screen: 'regulation-feedback',
  },
  {
    id: 'remove-background', slug: 'xoa-phong', icon: 'eraser',
    categories: ['image'], status: 'ready', screen: 'remove-background',
  },
  {
    id: 'cv', slug: 'tao-cv', icon: 'person-vcard',
    categories: ['document', 'other'], noFile: true, status: 'ready', screen: 'cv',
  },
  {
    id: 'pdf-password', slug: 'mat-khau-pdf', icon: 'file-earmark-lock',
    categories: ['document'], status: 'ready', screen: 'pdf-password',
  },
  {
    id: 'family-calendar', slug: 'lich-gia-dinh', icon: 'calendar-heart',
    categories: ['date', 'home'], noFile: true, status: 'ready', screen: 'family-calendar',
  },
  {
    id: 'address-conversion', slug: 'doi-dia-chi', icon: 'geo-alt',
    categories: ['data', 'other'], noFile: true, status: 'ready', screen: 'address-conversion',
  },
  {
    id: 'payroll', slug: 'luong', icon: 'wallet',
    categories: ['money'], noFile: true, status: 'ready', screen: 'payroll',
  },
  {
    id: 'lunar-calendar', slug: 'lich-am', icon: 'moon',
    categories: ['date', 'other'], noFile: true, status: 'ready', screen: 'lunar-calendar',
  },
  {
    id: 'electricity', slug: 'tien-dien', icon: 'lightning-charge',
    categories: ['money', 'home'], noFile: true, status: 'ready', screen: 'electricity',
  },
  {
    id: 'form-templates', slug: 'mau-don', icon: 'file-earmark-text',
    categories: ['document', 'other'], noFile: true, status: 'ready', screen: 'form-templates',
  },
  {
    id: 'dictation', slug: 'ghi-am', icon: 'mic',
    categories: ['other'], noFile: true,
    status: 'ready', screen: 'dictation',
  },
  {
    id: 'magnifier', slug: 'kinh-lup', icon: 'search',
    categories: ['other'], noFile: true, status: 'ready', screen: 'magnifier',
  },
  {
    id: 'house-estimate',
    slug: 'khai-toan-nha',
   
   
    icon: 'house',
    categories: ['construction', 'home', 'money'],
   
    noFile: true,
    status: 'ready',
    screen: 'house-estimate',
  },
  {
    id: 'number-words',
    slug: 'so-thanh-chu',
   
   
    icon: '123',
    categories: ['money', 'other'],
   
    noFile: true,
    status: 'ready',
    screen: 'number-words',
  },
  {
    id: 'loan',
    slug: 'vay-tra-gop',
   
   
    icon: 'cash-stack',
    categories: ['money'],
   
    noFile: true,
    status: 'ready',
    screen: 'loan',
  },
  {
    id: 'unit-price',
    slug: 'so-sanh-gia-theo-don-vi',
   
   
    icon: 'calculator',
    categories: ['money', 'home'],
   
    noFile: true,
    status: 'ready',
    screen: 'unit-price',
  },
  {
    id: 'study',
    slug: 'diem-hoc-tap',
   
   
    icon: 'mortarboard',
    categories: ['calc', 'other'],
   
    noFile: true,
    status: 'ready',
    screen: 'study',
  },
  {
    id: 'pomodoro',
    slug: 'pomodoro',
   
   
    icon: 'stopwatch',
    categories: ['date', 'other'],
   
    noFile: true,
    status: 'ready',
    screen: 'pomodoro',
  },
  {
    id: 'group-split',
    slug: 'chia-tien-nhom',
   
   
    icon: 'people',
    categories: ['money', 'home'],
   
    noFile: true,
    status: 'ready',
    screen: 'group-split',
  },
  {
    id: 'legacy-font',
    slug: 'chuyen-font-tieng-viet',
   
   
    icon: 'fonts',
    categories: ['data', 'other'],
   
    noFile: true,
    status: 'ready',
    screen: 'legacy-font',
  },
  {
    id: 'read-aloud',
    slug: 'doc-to-van-ban',
   
   
    icon: 'volume-up',
    categories: ['other'],
   
    noFile: true,
    status: 'ready',
    screen: 'read-aloud',
  },
  {
    id: 'vietqr',
    slug: 'vietqr-chuyen-khoan',
   
   
    icon: 'qr-code',
    categories: ['money', 'other'],
   
    noFile: true,
    status: 'ready',
    screen: 'vietqr',
  },
  {
    id: 'invoice-xml',
    slug: 'doc-hoa-don-xml',
   
   
    icon: 'filetype-xml',
    categories: ['data', 'money'],
   
    status: 'ready',
    screen: 'invoice-xml',
  },
  {
    id: 'remove-metadata',
    slug: 'xoa-metadata-anh',
   
   
    icon: 'geo-alt',
    categories: ['image', 'other'],
   
    status: 'ready',
    screen: 'remove-metadata',
  },
  {
    id: 'collage',
    slug: 'ghep-anh',
   
   
    icon: 'grid-3x3-gap',
    categories: ['image'],
   
    status: 'ready',
    screen: 'collage',
  },
  {
    id: 'message-risk',
    slug: 'kiem-tra-tin-nhan-link-la',
   
   
    icon: 'shield-exclamation',
    categories: ['other'],
   
    noFile: true,
    status: 'ready',
    screen: 'message-risk',
  },
  {
    id: 'flashcards',
    slug: 'the-ghi-nho',
   
   
    icon: 'card-text',
    categories: ['other'],
   
    noFile: true,
    status: 'ready',
    screen: 'flashcards',
  },
  {
    id: 'scan-to-pdf',
    slug: 'anh-sang-pdf',
   
   
    icon: 'camera',
    categories: ['document', 'image'],
    priority: 1,
   
   
    status: 'ready',
    screen: 'images-to-pdf',
  },
  {
    id: 'merge-pdf',
    slug: 'ghep-pdf',
   
   
    icon: 'files',
    categories: ['document'],
    priority: 2,
   
    status: 'ready',
    screen: 'merge-pdf',
  },
  {
    id: 'split-pdf',
    slug: 'tach-pdf',
   
   
    icon: 'scissors',
    categories: ['document'],
    priority: 3,
   
    status: 'ready',
    screen: 'split-pdf',
  },
  {
    id: 'compress-pdf',
    slug: 'nen-pdf',
   
   
    icon: 'file-earmark-zip',
    categories: ['document'],
    priority: 4,
   
    status: 'ready',
    screen: 'compress-pdf',
  },
  {
    id: 'convert-file',
    slug: 'pdf-sang-word',
   
   
    icon: 'arrow-left-right',
    categories: ['document'],
    processing: 'browser-model',
    priority: 6,
   
   
    status: 'ready',
    screen: 'convert-file',
  },
  {
    id: 'pdf-to-image',
    slug: 'pdf-sang-anh',
   
   
    icon: 'image',
    categories: ['document', 'image'],
   
    status: 'ready',
    screen: 'pdf-to-image',
  },
  {
    id: 'organize-pdf',
    slug: 'sap-xep-pdf',
   
   
    icon: 'grid-3x3-gap',
    categories: ['document'],
   
    status: 'ready',
    screen: 'organize-pdf',
  },
  {
    id: 'page-numbers',
    slug: 'danh-so-trang',
   
   
    icon: 'hash',
    categories: ['document'],
   
    status: 'ready',
    screen: 'page-numbers',
  },
  {
    id: 'stamp-pdf',
    slug: 'dong-dau-pdf',
   
   
    icon: 'droplet-half',
    categories: ['document'],
   
    status: 'ready',
    screen: 'stamp-pdf',
  },
  {
    id: 'redact-pdf',
    slug: 'che-thong-tin-pdf',
   
   
    icon: 'eye-slash',
    categories: ['document'],
   
    status: 'ready',
    screen: 'redact-pdf',
  },
  {
    id: 'view-pdf',
    slug: 'xem-pdf',
   
   
    icon: 'file-earmark-pdf',
    categories: ['document'],
    processing: 'browser-model',
   
    status: 'ready',
    screen: 'editor',
  },
  {
    id: 'ocr',
    slug: 'ocr-van-ban',
   
   
    icon: 'textarea-t',
    categories: ['document', 'image'],
    processing: 'browser-model',
    priority: 7,
   
    status: 'ready',
    screen: 'ocr',
  },
  {
    id: 'compare',
    slug: 'so-sanh-tai-lieu',
   
   
    icon: 'layout-split',
    categories: ['document'],
   
    status: 'ready',
    screen: 'compare-pdf',
  },
  {
    id: 'sign',
    slug: 'ky-tai-lieu',
   
   
    icon: 'pen',
    categories: ['document'],
   
    status: 'ready',
    screen: 'sign-pdf',
  },
  {
    id: 'edit-pdf',
    slug: 'chinh-sua-pdf',
   
   
    icon: 'pencil-square',
    categories: ['document'],
    processing: 'browser-model',
    priority: 5,
   
    status: 'ready',
    screen: 'editor',
  },
  {
    id: 'image-to-text',
    slug: 'anh-sang-van-ban',
   
   
    icon: 'card-text',
    categories: ['image', 'document'],
    processing: 'browser-model',
   
    status: 'ready',
    screen: 'image-to-text',
  },
  {
    id: 'measure-image',
    slug: 'do-kich-thuoc-anh',
   
   
    icon: 'rulers',
    categories: ['image', 'calc', 'construction'],
   
    status: 'ready',
    screen: 'measure-image',
  },
  {
    id: 'convert-image',
    slug: 'chuyen-doi-anh',
   
   
    icon: 'images',
    categories: ['image'],
    priority: 9,
   
    status: 'ready',
    screen: 'convert-image',
  },
  {
    id: 'compress-image',
    slug: 'nen-anh',
   
   
    icon: 'file-earmark-image',
    categories: ['image'],
    priority: 8,
   
    status: 'ready',
    screen: 'compress-image',
  },
  {
    id: 'crop-image',
    slug: 'cat-chinh-anh',
   
   
    icon: 'crop',
    categories: ['image'],
   
    status: 'ready',
    screen: 'crop-image',
  },
  {
    id: 'batch-image',
    slug: 'anh-hang-loat',
   
   
    icon: 'collection',
    categories: ['image'],
   
    status: 'ready',
    screen: 'batch-image',
  },
  {
    id: 'mark-image',
    slug: 'che-dong-dau-anh',
   
   
    icon: 'eye-slash',
    categories: ['image'],
   
    status: 'ready',
    screen: 'mark-image',
  },
  {
    id: 'id-photo',
    slug: 'anh-the',
   
   
    icon: 'person-badge',
    categories: ['image'],
   
    status: 'ready',
    screen: 'id-photo',
  },
  {
    id: 'qr-create',
    slug: 'tao-ma-qr',
   
   
    icon: 'qr-code',
    categories: ['data'],
    priority: 10,
   
    status: 'ready',
    screen: 'qr-create',
    noFile: true,
  },
  {
    id: 'barcode-create',
    slug: 'tao-ma-vach',
   
   
    icon: 'upc',
    categories: ['data'],
   
    status: 'ready',
    screen: 'barcode-create',
    noFile: true,
  },
  {
    id: 'qr-read',
    slug: 'doc-ma-qr',
   
   
    icon: 'qr-code-scan',
    categories: ['data'],
   
    status: 'ready',
    screen: 'qr-read',
  },
  {
    id: 'quick-calc',
    slug: 'tinh-toan-nhanh',
   
   
    icon: 'calculator',
    categories: ['calc'],
    priority: 11,
   
    status: 'ready',
    screen: 'quick-calc',
    noFile: true,
  },
  {
    id: 'money-calc',
    slug: 'tinh-tien',
   
   
    icon: 'cash-coin',
    categories: ['money'],
   
    status: 'ready',
    screen: 'money-calc',
    noFile: true,
  },
  {
    id: 'date-calc',
    slug: 'tinh-ngay',
   
   
    icon: 'calendar-check',
    categories: ['date'],
   
    status: 'ready',
    screen: 'date-calc',
    noFile: true,
  },
  {
    id: 'house-orientation',
    slug: 'huong-nha-la-ban',
   
   
    icon: 'compass',
    categories: ['home', 'construction'],
   
    status: 'ready',
    screen: 'house-orientation',
  },
  {
    id: 'quick-note',
    slug: 'ghi-chu-nhanh',
   
   
    icon: 'journal-check',
    categories: ['other'],
   
    status: 'ready',
    screen: 'quick-note',
    noFile: true,
  },
  {
    id: 'char-count',
    slug: 'dem-ky-tu',
   
   
    icon: 'fonts',
    categories: ['document'],
   
    status: 'ready',
    screen: 'char-count',
    noFile: true,
  },
  {
    id: 'unit-convert',
    slug: 'chuyen-doi-don-vi',
   
   
    icon: 'arrow-repeat',
    categories: ['calc'],
    priority: 12,
   
    status: 'ready',
    screen: 'unit-convert',
    noFile: true,
  },
  {
    id: 'color',
    slug: 'mau-sac',
   
   
    icon: 'palette',
    categories: ['image'],
   
    status: 'ready',
    screen: 'color',
    noFile: true,
  },
  {
    id: 'random-code',
    slug: 'tao-ma-ngau-nhien',
   
   
    icon: 'shuffle',
    categories: ['data'],
   
    status: 'ready',
    screen: 'random-code',
    noFile: true,
  },
  // "Sắp có": công cụ đã có trong mẫu giao diện nhưng chưa làm. Mô tả nói việc nó SẼ làm;
  // `processing: 'server'` = sẽ cần dữ liệu máy chủ, trang "Cách xử lý dữ liệu" nói trước.
  {
    id: 'construction-price', slug: 'gia-xay-dung', icon: 'database',
    categories: ['construction'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'planning-lookup', slug: 'quy-hoach', icon: 'map',
    categories: ['construction'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'construction-law', slug: 'phap-ly-xay-dung', icon: 'bank',
    categories: ['construction'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'construction-standards', slug: 'tieu-chuan-xay-dung', icon: 'book',
    categories: ['construction'], noFile: true, status: 'soon',
  },
  {
    id: 'dossier-check', slug: 'kiem-ho-so', icon: 'list-check',
    categories: ['construction', 'document'], processing: 'server', status: 'soon',
  },
  {
    id: 'structure-calc', slug: 'tinh-ket-cau', icon: 'bricks',
    categories: ['construction', 'calc'], noFile: true, status: 'soon',
  },
  {
    id: 'drawing-convert', slug: 'chuyen-doi-ban-ve', icon: 'arrow-left-right',
    categories: ['construction', 'document'], status: 'soon',
  },
  {
    id: 'drawing-area', slug: 'do-dien-tich-ban-ve', icon: 'bounding-box',
    categories: ['construction'], status: 'soon',
  },
  {
    id: 'site-diary', slug: 'nhat-ky-hien-truong', icon: 'camera',
    categories: ['construction'], noFile: true, status: 'soon',
  },
  {
    id: 'supplier-lookup', slug: 'tra-cuu-nha-cung-cap', icon: 'truck',
    categories: ['construction'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'family-reminders', slug: 'nhac-viec', icon: 'bell',
    categories: ['home', 'date'], noFile: true, status: 'soon',
  },
  {
    id: 'family-share', slug: 'chia-se-gia-dinh', icon: 'people',
    categories: ['home'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'family-health', slug: 'suc-khoe-gia-dinh', icon: 'heart-pulse',
    categories: ['home'], noFile: true, status: 'soon',
  },
  {
    id: 'house-chores', slug: 'viec-nha', icon: 'clipboard-check',
    categories: ['home'], noFile: true, status: 'soon',
  },
  {
    id: 'family-budget', slug: 'chi-tieu-gia-dinh', icon: 'wallet2',
    categories: ['home', 'money'], noFile: true, status: 'soon',
  },
  {
    id: 'family-album', slug: 'album-gia-dinh', icon: 'images',
    categories: ['home', 'image'], processing: 'server', status: 'soon',
  },
  {
    id: 'special-days', slug: 'ngay-dac-biet', icon: 'gift',
    categories: ['home', 'date'], noFile: true, status: 'soon',
  },
  {
    id: 'honor-board', slug: 'bang-vinh-danh', icon: 'trophy',
    categories: ['other'], processing: 'server', noFile: true, status: 'soon',
  },
  {
    id: 'code-manager', slug: 'quan-ly-ma', icon: 'upc-scan',
    categories: ['data'], processing: 'server', noFile: true, status: 'soon',
  },
]
