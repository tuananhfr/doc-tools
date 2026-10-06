export type HubPageSlug = 'xay-dung' | 'gia-dinh' | 'tai-lieu-pdf'

export interface HubSubgroup {
  /** Giá trị của `?nhom=` trên URL. */
  id: string
  label: string
  toolIds: readonly string[]
}

export interface HubIconText {
  icon: string
  title: string
  detail: string
}

export type HubArt =
  | { kind: 'image'; src: string; width: number; height: number }
  | { kind: 'icon'; icon: string }

export type HubAside =
  | { kind: 'product'; product: 'erpcons' | 'tekshot'; title: string; description: string; points: readonly string[] }
  | { kind: 'spotlight'; toolId: string; title: string; subtitle: string; points: readonly string[] }
  | { kind: 'tips'; title: string; items: readonly string[] }
  | { kind: 'privacy' }
  | { kind: 'support' }

export interface HubPage {
  slug: HubPageSlug
  /** Tên ngắn ở breadcrumb và menu. */
  label: string
  title: string
  /** Phần của tiêu đề được tô màu nhấn; phải nằm trong `title`. */
  titleAccent: string
  tagline: string
  description: string
  metaTitle: string
  metaDescription: string
  caption: string
  art: HubArt
  highlights: readonly string[]
  trust: readonly HubIconText[]
  searchPlaceholder: string
  subgroups: readonly HubSubgroup[]
  aside: readonly HubAside[]
  journey: { title: string; motto: string; flow: boolean; steps: readonly HubIconText[] }
}
