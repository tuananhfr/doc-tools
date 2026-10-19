export const LANDING_NAVIGATION = [
  { key: 'features', hash: '#tien-ich' },
  { key: 'how', hash: '#cach-dung' },
  { key: 'privacy', hash: '#du-lieu' },
  { key: 'ecosystem', hash: '/he-sinh-thai' },
] as const

export const USE_CASES = [
  { key: 'documents', image: 'documents.webp', to: '/tai-lieu-pdf' },
  { key: 'media', image: 'media.webp', to: '/' },
  { key: 'everyday', image: 'everyday.webp', to: '/?nhom=gia-dinh' },
] as const

export const PDF_TOOL_IDS = ['edit-pdf', 'merge-pdf', 'split-pdf'] as const
export const WORKFLOW_STEPS = [
  { key: 'choose', icon: 'search' },
  { key: 'input', icon: 'file-earmark-plus' },
  { key: 'result', icon: 'download' },
] as const
export const PRIVACY_ROWS = [
  { key: 'local', icon: 'laptop' },
  { key: 'online', icon: 'cloud' },
  { key: 'choice', icon: 'sliders' },
] as const

/** 6–8 việc thường dùng ở màn đầu (spec v3 §05 HOME); nhãn là tên công cụ trong catalog. */
export const COMMON_TASK_IDS = ['compress-pdf', 'merge-pdf', 'scan-to-pdf', 'image-to-text', 'id-photo', 'qr-create', 'read-aloud', 'money-calc'] as const
