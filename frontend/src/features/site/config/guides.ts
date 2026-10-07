export type GuideGroupId = 'tai-lieu' | 'hinh-anh-qr' | 'xay-dung' | 'gia-dinh'
export type GuideSlug = 'nen-pdf' | 'scan-anh-sang-pdf' | 'tach-pdf' | 'ocr-van-ban' | 'tao-va-doc-ma-qr' | 'xem-huong-nha' | 'khai-toan-xay-nha' | 'lich-gia-dinh'

export interface Guide {
  slug: GuideSlug
  /** Công cụ đầu tiên là công cụ chính: nút "Mở công cụ" và icon của bài. */
  toolIds: [string, ...string[]]
  group: GuideGroupId
  minutes: number
  /** Id bước, mẹo, lưu ý theo thứ tự hiển thị; chữ ở `guides:items.<slug>`. */
  steps: readonly string[]
  tips: readonly string[]
  notes: readonly string[]
}

/** Chữ của một bài, đọc từ `guides:items.<slug>`. */
export interface GuideText {
  title: string
  summary: string
  intro: string
  steps: Record<string, { title: string; detail: string }>
  tips: Record<string, string>
  notes: Record<string, string>
}

export const GUIDE_GROUPS: readonly { id: GuideGroupId; icon: string }[] = [
  { id: 'tai-lieu', icon: 'file-earmark-pdf' },
  { id: 'hinh-anh-qr', icon: 'qr-code' },
  { id: 'xay-dung', icon: 'building' },
  { id: 'gia-dinh', icon: 'house-heart' },
]

/**
 * Chữ bài ở `messages/<locale>/guides.json`. Nhãn nút trong ngoặc kép phải khớp chữ
 * trên màn hình công cụ; đổi nhãn ở công cụ thì sửa cả bài. Bản nháp 06/10/2026, chờ duyệt nội dung.
 */
export const GUIDES: readonly Guide[] = [
  {
    slug: 'nen-pdf',
    toolIds: ['compress-pdf'],
    group: 'tai-lieu',
    minutes: 1,
    steps: ['pick', 'level', 'compress', 'download'],
    tips: ['scans', 'email', 'password'],
    notes: ['textOnly', 'png', 'limits'],
  },
  {
    slug: 'scan-anh-sang-pdf',
    toolIds: ['scan-to-pdf'],
    group: 'tai-lieu',
    minutes: 2,
    steps: ['pick', 'capture', 'order', 'paper', 'create'],
    tips: ['shoot', 'fit', 'next'],
    notes: ['https', 'formats'],
  },
  {
    slug: 'tach-pdf',
    toolIds: ['split-pdf'],
    group: 'tai-lieu',
    minutes: 1,
    steps: ['pick', 'mode', 'split', 'download'],
    tips: ['single', 'appendix', 'edit'],
    notes: ['onePage', 'outOfRange'],
  },
  {
    slug: 'ocr-van-ban',
    toolIds: ['ocr', 'image-to-text'],
    group: 'tai-lieu',
    minutes: 3,
    steps: ['pick', 'output', 'run', 'download'],
    tips: ['quality', 'existing', 'image'],
    notes: ['language', 'accuracy', 'network'],
  },
  {
    slug: 'tao-va-doc-ma-qr',
    toolIds: ['qr-create', 'barcode-create', 'qr-read'],
    group: 'hinh-anh-qr',
    minutes: 2,
    steps: ['qr', 'colors', 'barcode', 'scan', 'use'],
    tips: ['wifi', 'print', 'ean'],
    notes: ['gs1', 'links', 'wifiPassword'],
  },
  {
    slug: 'xem-huong-nha',
    toolIds: ['house-orientation'],
    group: 'xay-dung',
    minutes: 3,
    steps: ['position', 'measure', 'read', 'age', 'save'],
    tips: ['repeat', 'expert', 'iphone'],
    notes: ['sensor', 'https', 'reference', 'save'],
  },
  {
    slug: 'khai-toan-xay-nha',
    toolIds: ['house-estimate'],
    group: 'xay-dung',
    minutes: 2,
    steps: ['area', 'price', 'ratios', 'result'],
    tips: ['quotes', 'deposit', 'noSave'],
    notes: ['ratios', 'excluded', 'prices'],
  },
  {
    slug: 'lich-gia-dinh',
    toolIds: ['family-calendar'],
    group: 'gia-dinh',
    minutes: 5,
    steps: ['members', 'add', 'remind', 'view', 'sos', 'backup'],
    tips: ['viewing', 'backupFirst', 'ics'],
    notes: ['openPage', 'sos', 'clearData'],
  },
]

export function findGuide(slug: string | undefined): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug)
}
