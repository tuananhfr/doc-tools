import { describe, expect, it } from 'vitest'
import { VI_TOOL_CATALOG } from '@/features/tools/hub/utils/tool-catalog.fixture'
import { COMMON_TASK_IDS } from '../landing/config/landing-content'
import { pickCommonTasks } from './common-tasks'

describe('common tasks on the home page', () => {
  it('shows 6 to 8 ready tools in the declared order', () => {
    expect(COMMON_TASK_IDS.length).toBeGreaterThanOrEqual(6)
    expect(COMMON_TASK_IDS.length).toBeLessThanOrEqual(8)
    expect(pickCommonTasks(COMMON_TASK_IDS, VI_TOOL_CATALOG).map((tool) => tool.id)).toEqual([...COMMON_TASK_IDS])
  })

  it('drops switched-off, coming-soon and unknown ids', () => {
    const catalog = VI_TOOL_CATALOG.filter((tool) => tool.id !== 'compress-pdf')
    expect(pickCommonTasks(['compress-pdf', 'family-reminders', 'khong-co', 'merge-pdf'], catalog).map((tool) => tool.id)).toEqual(['merge-pdf'])
  })
})
