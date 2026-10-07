const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
process.env.MAIL_TRANSPORT = 'log'
require('reflect-metadata')
require('dotenv/config')
const { DatabaseService } = require('../dist/database/database.service')
const { MailOutboxRepository, RETRY_DELAYS } = require('../dist/mail/mail-outbox.repository')
const { MailService } = require('../dist/mail/mail.service')
const { MailSendError } = require('../dist/mail/mail-transport')

test('outbox retries transient failures, stops on rejection or expiry and scrubs payloads', async () => {
  const database = new DatabaseService()
  await database.onModuleInit()
  const tag = randomBytes(6).toString('hex')
  const to = (name) => `qa-${tag}-${name}@example.test`
  try {
    const outbox = new MailOutboxRepository(database)
    const service = new MailService(outbox)
    const now = Math.floor(Date.now() / 1000)
    const payload = { code: '123456', locale: 'vi', ttlMinutes: 10 }
    const transient = await outbox.enqueue(to('transient'), 'otp', payload, null, now)
    const rejected = await outbox.enqueue(to('rejected'), 'otp', payload, null, now)
    const expired = await outbox.enqueue(to('expired'), 'otp', payload, now - 1, now)
    const delivered = []
    const transport = {
      async send(mail) {
        if (mail.to === to('transient')) throw new MailSendError('421 try later', false)
        if (mail.to === to('rejected')) throw new MailSendError('550 no such user', true)
        delivered.push(mail)
      },
    }
    await service.processDue(transport)

    const retry = await outbox.status(transient)
    assert.equal(retry.status, 'pending')
    assert.equal(retry.attempts, 1)
    assert.equal(retry.lastError, '421 try later')
    assert.deepEqual(retry.payload, payload, 'payload kept while a retry is scheduled')
    const [next] = await database.pool.execute('SELECT next_attempt_at FROM mail_outbox WHERE id = ?', [transient])
    assert.ok(Number(next[0].next_attempt_at) >= now + RETRY_DELAYS[0])

    for (const id of [rejected, expired]) {
      const row = await outbox.status(id)
      assert.equal(row.status, 'failed')
      assert.deepEqual(row.payload, {})
    }
    assert.equal((await outbox.status(expired)).lastError, 'expired before delivery')
    assert.equal(delivered.some((mail) => mail.to.includes(tag)), false)

    // The final scheduled retry gives up instead of rescheduling.
    const exhausted = { id: transient, attempts: RETRY_DELAYS.length, toEmail: to('transient'), template: 'otp', payload, expiresAt: null }
    assert.equal(await outbox.markFailed(exhausted, 'still down', false, now), 'failed')
  } finally {
    await database.pool.execute('DELETE FROM mail_outbox WHERE to_email LIKE ?', [`qa-${tag}-%`])
    await database.onModuleDestroy()
  }
})
