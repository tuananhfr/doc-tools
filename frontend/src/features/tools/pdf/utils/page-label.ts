import type { SourceFile } from '../types/doc-tools.types'
import { baseName } from './file-guard'

/** Nhãn nguồn của một trang ("hop-dong · tr 3"); tệp một trang không cần số trang gốc. */
export function describeOrigin(source: SourceFile | undefined, pageIndex: number): string {
  if (!source) return 'Không rõ nguồn'
  if (source.label) return source.label
  return `${baseName(source.name)}${source.pageCount > 1 ? ` · tr ${pageIndex + 1}` : ''}`
}
