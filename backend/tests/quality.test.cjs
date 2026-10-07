require('dotenv/config')
require('reflect-metadata')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { DatabaseService } = require('../dist/database/database.service')
const { QualityRepository } = require('../dist/tools/quality.repository')
const { QualityService } = require('../dist/tools/quality.service')

test('quality service rotates rate-limit hashes without retaining raw IP', async () => {
  const events = []
  const repository = { record: async (...args) => events.push(args) }
  const service = new QualityService(repository)
  const event = { event: 'download', tool: 'ocr' }
  await service.record(event, '198.51.100.71')
  assert.equal(events.length, 1)
  assert.equal(events[0][1].length, 64)
  assert.ok(!JSON.stringify(events).includes('198.51.100.71'))
  assert.deepEqual(events[0][0], event)
})

test('aggregate counter handles concurrency and rate limit on the isolated DocTools database', async () => {
  assert.equal(process.env.DB_NAME ?? 'doc_tools', 'doc_tools', 'Never test against an ERPCons database')
  const database = new DatabaseService(), repository = new QualityRepository(database)
  const now = Math.floor(Date.UTC(2097, 10, 21) / 1000), day = '2097-11-21', hour = Math.floor(now / 3600), hash = crypto.randomBytes(32).toString('hex')
  let owned = false
  try {
    await database.onModuleInit()
    const [before] = await database.pool.execute('SELECT count FROM quality_daily WHERE day = ? AND event = ? AND tool = ?', [day, 'download', 'ocr'])
    assert.equal(before.length, 0, 'QA key is already occupied; do not change existing rows')
    owned = true
    const replies = await Promise.all(Array.from({ length: 16 }, () => repository.record({ event: 'download', tool: 'ocr' }, hash, now)))
    assert.equal(replies.filter(Boolean).length, 16)
    await database.pool.execute('UPDATE quality_flood SET count = 119 WHERE ip_hash = ? AND hour = ?', [hash, hour])
    const limited = await Promise.all(Array.from({ length: 12 }, () => repository.record({ event: 'download', tool: 'ocr' }, hash, now)))
    assert.equal(limited.filter(Boolean).length, 1)
    const rows = await repository.report(day, day)
    assert.deepEqual(rows, [{ day, event: 'download', tool: 'ocr', count: 17 }])
  } finally {
    if (owned) await database.pool.execute('DELETE FROM quality_daily WHERE day = ? AND event = ? AND tool = ?', [day, 'download', 'ocr'])
    await database.pool.execute('DELETE FROM quality_flood WHERE ip_hash = ?', [hash]).catch(() => undefined)
    await database.onModuleDestroy()
  }
})
