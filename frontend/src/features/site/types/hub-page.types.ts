export type HubPageSlug = 'xay-dung' | 'gia-dinh' | 'tai-lieu-pdf'

export interface HubSubgroup {
  /** Giá trị của `?nhom=` trên URL. */
  id: string
  toolIds: readonly string[]
}

export interface HubIconItem {
  id: string
  icon: string
}

export type HubArt =
  | { kind: 'image'; src: string; width: number; height: number }
  | { kind: 'icon'; icon: string }

/** `id` là khoá chữ của thẻ trong `site:hubs.<slug>.aside`; `points` / `items` giữ thứ tự hiển thị. */
export type HubAside =
  | { kind: 'product'; id: string; product: 'erpcons' | 'tekshot'; points: readonly string[] }
  | { kind: 'spotlight'; id: string; toolId: string; points: readonly string[] }
  | { kind: 'tips'; id: string; items: readonly string[] }
  | { kind: 'privacy' }
  | { kind: 'support' }

/** Cấu trúc trang nhóm; chữ nằm ở `site:hubs.<slug>`, mảng ở đây chỉ giữ id và thứ tự. */
export interface HubPage {
  slug: HubPageSlug
  art: HubArt
  highlights: readonly string[]
  trust: readonly HubIconItem[]
  subgroups: readonly HubSubgroup[]
  aside: readonly HubAside[]
  journey: { flow: boolean; steps: readonly HubIconItem[] }
}

interface HubTitleDetail {
  title: string
  detail: string
}

/** Chữ của một trang nhóm, đọc từ `site:hubs.<slug>`. `title` có thẻ `<accent>` cho phần tô màu. */
export interface HubPageText {
  /** Tên ngắn ở breadcrumb và menu. */
  label: string
  title: string
  tagline: string
  description: string
  metaTitle: string
  metaDescription: string
  caption: string
  searchPlaceholder: string
  highlights: Record<string, string>
  trust: Record<string, HubTitleDetail>
  subgroups: Record<string, string>
  aside: Record<string, { title: string; description?: string; subtitle?: string; points?: Record<string, string>; items?: Record<string, string> }>
  journey: { title: string; motto: string; steps: Record<string, HubTitleDetail> }
}
