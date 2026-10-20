import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { HUB_PAGES } from '../config/hub-pages'
import { HUB_NAVIGATION } from '../config/site-navigation'
import type { ActiveHubPageSlug } from '../types/hub-page.types'

export type DirectoryGroup = 'all' | ActiveHubPageSlug
export const DIRECTORY_GROUPS: readonly DirectoryGroup[] = ['all', ...HUB_NAVIGATION]
export const DIRECTORY_GROUP_ICONS: Record<DirectoryGroup, string> = {
  all: 'grid-fill', 'tai-lieu-pdf': 'file-earmark-pdf', 'hinh-anh': 'images',
  'mau-giay-to': 'file-earmark-text', 'ma-qr': 'qr-code',
  'tinh-toan': 'calculator', 'kham-pha-giai-tri': 'stars', 'gia-dinh': 'house-heart',
}
const GROUP_IDS = new Map(HUB_NAVIGATION.map(slug => [slug, new Set(HUB_PAGES[slug].subgroups.flatMap(group => group.toolIds))]))
const LEGACY_GROUPS: Record<string, DirectoryGroup> = { document: 'tai-lieu-pdf', image: 'hinh-anh', calc: 'tinh-toan', money: 'tinh-toan', date: 'tinh-toan', data: 'ma-qr', home: 'gia-dinh', tech: 'all', other: 'all', 'doc-va-nghe': 'gia-dinh' }

/** One shared owner for directory cards, workspace menus and breadcrumbs. */
export function directoryToolGroup(toolId: string): ActiveHubPageSlug | null {
  return HUB_NAVIGATION.find(group => GROUP_IDS.get(group)?.has(toolId)) ?? null
}

export function directoryGroup(value: string | null): DirectoryGroup {
  return DIRECTORY_GROUPS.find(group => group === value) ?? LEGACY_GROUPS[value ?? ''] ?? 'all'
}

/** Each catalog tool belongs to exactly one visible group. */
export function directoryGroupTools<T extends ToolDefinition>(catalog: readonly T[], group: DirectoryGroup): T[] {
  if (group === 'all') return [...catalog]
  return catalog.filter(tool => GROUP_IDS.get(group)?.has(tool.id))
}
