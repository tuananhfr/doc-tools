import { describe, expect, it } from 'vitest'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { pickLandingTools } from './landing-tools'

const catalog = [
  { slug: 'ghep-pdf', status: 'ready', icon: 'files', name: 'Ghép PDF', description: 'Gộp nhiều tệp' },
  { slug: 'thuoc-lo-ban', status: 'soon', icon: 'rulers', name: 'Thước Lỗ Ban', description: 'Sắp có' },
] as unknown as ToolDefinition[]

describe('pickLandingTools', () => {
  it('fills empty card text from the catalog and keeps what staff wrote', () => {
    expect(pickLandingTools([{ slug: 'ghep-pdf', title: '', body: 'Gộp hồ sơ thầu' }], catalog))
      .toEqual([{ slug: 'ghep-pdf', icon: 'files', title: 'Ghép PDF', body: 'Gộp hồ sơ thầu' }])
  })

  it('drops tools that are unknown or not ready yet', () => {
    expect(pickLandingTools([{ slug: 'thuoc-lo-ban', title: 'A', body: '' }, { slug: 'khong-co', title: 'B', body: '' }], catalog)).toEqual([])
  })
})
