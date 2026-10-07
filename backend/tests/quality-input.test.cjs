const { test } = require('node:test')
const assert = require('node:assert/strict')
const { qualityInput } = require('../dist/tools/quality-input')

test('quality input accepts only fixed aggregate dimensions and rejects content', () => {
  assert.deepEqual(qualityInput({ event: 'zero-result', tool: 'none' }), { event: 'zero-result', tool: 'none' })
  assert.deepEqual(qualityInput({ event: 'download', tool: 'ocr' }), { event: 'download', tool: 'ocr' })
  for (const input of [null, [], { event: 'query', tool: 'none' }, { event: 'completion', tool: 'none' }, { event: 'zero-result', tool: 'ocr' },
    { event: 'download', tool: 'private-name' }, { event: 'download', tool: 'ocr', query: 'private text' }, { event: 'download', tool: 'ocr', filename: 'private.pdf' }]) assert.equal(qualityInput(input), null)
})
