const { test } = require('node:test')
const assert = require('node:assert/strict')
const { trustedOrigins } = require('../dist/session/trusted-origins')

test('missing allowlist accepts the configured public site, not arbitrary origins', () => {
  const origins = trustedOrigins([], 'https://site.test/doc-tools', '0.0.0.0', true)
  assert.deepEqual(origins, ['https://site.test'])
  assert.equal(origins.includes('https://qa.invalid'), false)
})

test('local frontend defaults are restricted to loopback development', () => {
  const local = trustedOrigins([], 'https://site.test/doc-tools', '127.0.0.1', false)
  assert(local.includes('http://localhost:3002'))
  assert(local.includes('http://127.0.0.1:3002'))
  assert(!trustedOrigins([], 'https://site.test', '0.0.0.0', false).includes('http://localhost:3002'))
  assert(!trustedOrigins([], 'https://site.test', '127.0.0.1', true).includes('http://localhost:3002'))
})

test('explicit origins take precedence; invalid site URL fails closed', () => {
  assert.deepEqual(trustedOrigins(['https://custom.test'], 'https://site.test', '127.0.0.1', false), ['https://custom.test'])
  assert.deepEqual(trustedOrigins([], 'invalid', '0.0.0.0', true), [])
})
