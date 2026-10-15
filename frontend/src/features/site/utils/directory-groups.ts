import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { HUB_PAGES } from '../config/hub-pages'
import { HUB_NAVIGATION } from '../config/site-navigation'
import type { HubPageSlug } from '../types/hub-page.types'

export type DirectoryGroup = 'all' | HubPageSlug | 'other'
export const DIRECTORY_GROUPS: readonly DirectoryGroup[] = ['all', ...HUB_NAVIGATION, 'other']
export const DIRECTORY_GROUP_ICONS: Record<DirectoryGroup, string> = {
  all: 'grid-fill', 'tai-lieu-pdf': 'file-earmark-pdf', 'hinh-anh': 'images',
  'mau-giay-to': 'file-earmark-text', 'ma-qr': 'qr-code', 'doc-va-nghe': 'mic',
  'tinh-toan': 'calculator', 'xay-dung': 'tools', 'kham-pha-giai-tri': 'stars',
  'gia-dinh': 'house-heart', other: 'three-dots',
}
const GROUP_IDS = new Map(HUB_NAVIGATION.map(slug => [slug, new Set(HUB_PAGES[slug].subgroups.flatMap(group => group.toolIds))]))
const GROUPED_IDS = new Set([...GROUP_IDS.values()].flatMap(ids => [...ids]))
const LEGACY_GROUPS: Record<string, DirectoryGroup> = { document: 'tai-lieu-pdf', image: 'hinh-anh', calc: 'tinh-toan', money: 'tinh-toan', date: 'tinh-toan', data: 'ma-qr', construction: 'xay-dung', home: 'gia-dinh', tech: 'other' }

export function directoryGroup(value: string | null): DirectoryGroup {
  return DIRECTORY_GROUPS.find(group => group === value) ?? LEGACY_GROUPS[value ?? ''] ?? 'all'
}

/** Reuse the existing hub membership; Other is the remainder, so no tool disappears. */
export function directoryGroupTools<T extends ToolDefinition>(catalog: readonly T[], group: DirectoryGroup): T[] {
  if (group === 'all') return [...catalog]
  if (group === 'other') return catalog.filter(tool => !GROUPED_IDS.has(tool.id))
  return catalog.filter(tool => GROUP_IDS.get(group)?.has(tool.id))
}
