export const LANDING_NAVIGATION = [
  { key: 'features', hash: '#tien-ich' },
  { key: 'how', hash: '#cach-dung' },
  { key: 'privacy', hash: '#du-lieu' },
] as const

export const USE_CASES = [
  { key: 'documents', image: 'documents.webp', to: '/tai-lieu-pdf' },
  { key: 'media', image: 'media.webp', to: '/cong-cu' },
  { key: 'everyday', image: 'everyday.webp', to: '/gia-dinh' },
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
