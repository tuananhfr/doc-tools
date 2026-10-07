import { expect, it } from 'vitest'
import { VI_TOOL_CATALOG } from '@/features/tools/hub/utils/tool-catalog.fixture'
import { assistantMatches, assistantPrompt } from './assistant-prompt'

it('finds tools from a natural-language request and redacts secrets in copied text', () => {
  const matches = assistantMatches(VI_TOOL_CATALOG, 'Tôi muốn gộp hai tệp PDF')
  expect(matches.map((item) => item.id)).toContain('merge-pdf')
  expect(assistantPrompt('token=private123 và gộp PDF', matches)).not.toContain('private123')
})
