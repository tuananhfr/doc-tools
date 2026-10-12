const { test } = require('node:test')
const assert = require('node:assert/strict')
require('reflect-metadata')
const { EntertainmentController } = require('../dist/entertainment/entertainment.controller')

test('catalog distinguishes the local interpretation library from calculation sources and calendar rules', () => {
  const catalog = new EntertainmentController({}).tools()
  assert.equal(catalog.ok, true)
  for (const kind of ['tarot', 'cards', 'numerology']) assert.equal(catalog.tools.find(tool => tool.kind === kind).interpretation_available, true)
  assert.equal(catalog.tools.find(tool => tool.kind === 'calendar').interpretation_available, false)
  assert.equal(catalog.sources[0].corpus_available, false)
  assert.deepEqual(catalog.sources[1], { id: 'cn-ent-interpretation-vi-v1', status: 'EDITORIAL', corpus_available: true, language: 'vi' })
})
