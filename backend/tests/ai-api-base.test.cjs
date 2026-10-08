// Mail/GoClaw settings an owner saved in the dev database's admin area must not reach these tests.
process.env.CONFIG_FROM_ENV_ONLY = '1'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { checkApiBase, isPrivateAddress } = require('../dist/ai/api-base')

const fake = (map) => async (host) => {
  if (!(host in map)) throw new Error('ENOTFOUND')
  return map[host]
}

test('api base: only public https addresses reach GoClaw', async () => {
  const dns = fake({ 'api.example.com': ['93.184.216.34'], 'sneaky.example.com': ['93.184.216.34', '10.0.0.5'], 'empty.example.com': [] })
  assert.deepEqual(await checkApiBase('https://api.example.com/v1/', false, dns), { ok: true, url: 'https://api.example.com/v1' })
  assert.equal((await checkApiBase('http://api.example.com/v1', false, dns)).reason, 'NOT_HTTPS')
  assert.equal((await checkApiBase('https://sneaky.example.com', false, dns)).reason, 'PRIVATE')
  assert.equal((await checkApiBase('https://empty.example.com', false, dns)).reason, 'UNRESOLVED')
  assert.equal((await checkApiBase('https://missing.example.com', false, dns)).reason, 'UNRESOLVED')
  assert.equal((await checkApiBase('https://localhost:11434', false, dns)).reason, 'PRIVATE')
  assert.equal((await checkApiBase('https://127.0.0.1', false, dns)).reason, 'PRIVATE')
  assert.equal((await checkApiBase('https://[::1]/v1', false, dns)).reason, 'PRIVATE')
  assert.equal((await checkApiBase('https://[::ffff:192.168.1.2]/v1', false, dns)).reason, 'PRIVATE')
  assert.equal((await checkApiBase('https://user:pass@api.example.com', false, dns)).reason, 'INVALID')
  assert.equal((await checkApiBase('https://api.example.com/v1?key=1', false, dns)).reason, 'INVALID')
  assert.equal((await checkApiBase('not a url', false, dns)).reason, 'INVALID')
  assert.equal((await checkApiBase('ftp://api.example.com', false, dns)).reason, 'NOT_HTTPS')
})

test('api base: the development flag lets a local Ollama through', async () => {
  assert.deepEqual(await checkApiBase('http://localhost:11434/v1', true), { ok: true, url: 'http://localhost:11434/v1' })
  assert.equal((await checkApiBase('ftp://localhost', true)).reason, 'NOT_HTTPS')
})

test('api base: private ranges', () => {
  for (const address of ['10.1.2.3', '172.20.0.1', '192.168.0.10', '169.254.169.254', '100.64.0.1', '0.0.0.0', 'fd00::1', 'fe80::1', '::1', 'garbage']) {
    assert.equal(isPrivateAddress(address), true, address)
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPrivateAddress(address), false, address)
})
