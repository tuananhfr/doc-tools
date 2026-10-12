import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HEADER, describeCheck, gateStatus, matchTestFiles, parseCsv, toCsv } from './release-gates.mjs'

test('CSV round-trips quotes, commas, newlines and the BOM', () => {
  const row = Object.fromEntries(HEADER.map((key) => [key, '']))
  row.test_id = 'NAV01'
  row.scenario = 'Các tác vụ trùng workspace, URL "cũ" còn chạy'
  row.actual = 'dòng 1\ndòng 2'
  const text = toCsv([row])
  assert.equal(text.charCodeAt(0), 0xfeff)
  assert.equal(text.includes('\r'), false)
  assert.deepEqual(parseCsv(text), [row])
})

test('gateStatus never reports PASS without a passing check', () => {
  assert.equal(gateStatus([], 'thiết bị thật'), 'MANUAL')
  assert.equal(gateStatus([], ''), 'BLOCKED')
  assert.equal(gateStatus([{ ok: true }, { ok: false }], ''), 'FAIL')
  assert.equal(gateStatus([{ ok: false }, { ok: null }], ''), 'FAIL')
  assert.equal(gateStatus([{ ok: true }, { ok: null }], ''), 'BLOCKED')
  assert.equal(gateStatus([{ ok: true }], 'thiết bị thật'), 'PARTIAL_PASS')
  assert.equal(gateStatus([{ ok: true }, { ok: true }], ''), 'PASS')
})

test('matchTestFiles finds files by name or by content', () => {
  const results = [{ file: 'C:\\repo\\src\\a\\tool-search.test.ts', ok: true }, { file: '/repo/src/b/contrast.test.ts', ok: false }]
  const read = (file) => (file.includes('contrast') ? 'contrastRatio(a, b)' : 'search')
  assert.equal(matchTestFiles(results, { file: 'tool-search.test.ts' }, read).ok, true)
  assert.equal(matchTestFiles(results, { has: 'contrastRatio' }, read).ok, false)
  assert.equal(matchTestFiles(results, { file: 'missing.test.ts' }, read).ok, null)
  assert.equal(matchTestFiles(results, { has: ['search', 'contrastRatio'] }, read).ok, null)
})

test('describeCheck', () => {
  assert.equal(describeCheck({ kind: 'vitest', file: 'a.test.ts' }), 'vitest:a.test.ts')
  assert.equal(describeCheck({ kind: 'vitest', has: ['device', 'offline'] }), 'vitest(has):device&offline')
  assert.equal(describeCheck({ kind: 'backend', file: 'read.test.cjs' }), 'backend:read.test.cjs')
  assert.equal(describeCheck({ kind: 'script', name: 'golden' }), 'script:golden')
})
