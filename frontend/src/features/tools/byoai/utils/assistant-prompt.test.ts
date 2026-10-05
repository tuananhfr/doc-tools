import { expect, it } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import { assistantMatches, assistantPrompt } from './assistant-prompt'

it('finds tools from a natural-language request and redacts secrets in copied text', () => {
  const matches = assistantMatches(ALL_TOOLS, 'Tôi muốn gộp hai tệp PDF')
  expect(matches.map((item) => item.id)).toContain('merge-pdf')
  expect(assistantPrompt('token=private123 và gộp PDF', matches)).not.toContain('private123')
})
