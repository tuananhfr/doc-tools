import { ALL_TOOLS } from '../config/tool-list'

export function qualityToolForPath(path: string): string {
  const slug = path.split('/').filter(Boolean).at(-1)
  return ALL_TOOLS.find(tool => tool.slug === slug)?.id ?? 'none'
}
