const { test } = require('node:test')
const assert = require('node:assert/strict')
const { findTools, toolGuide } = require('../dist/mcp/tool-catalog')

test('the MCP catalog tells the assistant what works offline and what hardware a tool needs', () => {
  const electricity = toolGuide('tien-dien', 'vi')
  assert.equal(electricity.offline, 'no')
  assert.deepEqual(electricity.needs, ['network'])
  const qrRead = toolGuide('doc-ma-qr', 'vi')
  assert.ok(qrRead.needs.includes('camera'))
  const found = findTools('nén ảnh', 'vi', 5)
  assert.ok(found.length > 0)
  for (const item of found) {
    assert.ok(['yes', 'after-first-use', 'no'].includes(item.offline), `${item.slug} has offline`)
    assert.ok(Array.isArray(item.needs))
  }
})
