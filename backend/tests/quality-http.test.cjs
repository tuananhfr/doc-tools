require('reflect-metadata')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Module } = require('@nestjs/common')
const { NestFactory } = require('@nestjs/core')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { QualityController } = require('../dist/tools/quality.controller')
const { QualityService } = require('../dist/tools/quality.service')

test('quality HTTP endpoint rejects content and oversized bodies before recording an aggregate', async () => {
  const received = []
  class TestModule {}
  Module({ controllers: [QualityController], providers: [{ provide: QualityService, useValue: { record: async event => { received.push(event); return { ok: true } } } }] })(TestModule)
  const adapter = createHttpAdapter(), app = await NestFactory.create(TestModule, adapter, { bodyParser: false, logger: false })
  app.setGlobalPrefix('api/v1')
  try {
    await app.init(); await adapter.getInstance().ready()
    const request = payload => adapter.getInstance().inject({ method: 'POST', url: '/api/v1/tools/quality', headers: { 'content-type': 'application/json' }, payload })
    const valid = await request({ event: 'download', tool: 'ocr' })
    assert.equal(valid.statusCode, 200); assert.equal(valid.headers['cache-control'], 'no-store')
    assert.deepEqual(valid.json(), { ok: true })
    assert.equal((await request({ event: 'download', tool: 'ocr', query: 'private text' })).statusCode, 400)
    assert.equal((await request('{broken json')).statusCode, 400)
    assert.equal((await request({ event: 'download', tool: 'ocr', filename: 'x'.repeat(2000) })).statusCode, 413)
    assert.deepEqual(received, [{ event: 'download', tool: 'ocr' }])
  } finally { await app.close() }
})
