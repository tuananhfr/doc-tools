import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { configuration } from '../config/configuration'
import { MailOutboxRepository } from './mail-outbox.repository'
import { renderMail, type MailTemplate } from './mail-templates'
import { createMailTransport, MailSendError, type MailTransport } from './mail-transport'

const POLL_MS = 15000
const BATCH = 10

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Mail')
  private transport: MailTransport | null = null
  private timer?: NodeJS.Timeout
  // Serializes drains so a request-triggered kick and the poll timer never claim concurrently in one process.
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private readonly outbox: MailOutboxRepository) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processDue().catch((error) => this.logger.error(error)), POLL_MS)
    this.timer.unref()
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  /** `expiresAt`: drop the message instead of sending it late (one-time codes). */
  async enqueue(to: string, template: MailTemplate, payload: unknown, expiresAt: number | null = null) {
    const id = await this.outbox.enqueue(to, template, payload, expiresAt, Math.floor(Date.now() / 1000))
    setImmediate(() => void this.processDue().catch((error) => this.logger.error(error)))
    return id
  }

  processDue(transport?: MailTransport): Promise<number> {
    const run = this.queue.then(() => this.drain(transport ?? this.defaultTransport()), () => this.drain(transport ?? this.defaultTransport()))
    this.queue = run.catch(() => undefined)
    return run
  }

  private defaultTransport() {
    this.transport ??= createMailTransport(configuration().mail)
    return this.transport
  }

  private async drain(transport: MailTransport) {
    let handled = 0
    for (;;) {
      const now = Math.floor(Date.now() / 1000)
      const rows = await this.outbox.claim(now, BATCH)
      if (!rows.length) break
      for (const row of rows) {
        handled++
        if (row.expiresAt !== null && row.expiresAt <= now) {
          await this.outbox.markFailed(row, 'expired before delivery', true, now)
          continue
        }
        try {
          await transport.send({ to: row.toEmail, ...renderMail(row.template, row.payload) })
          await this.outbox.markSent(row.id, Math.floor(Date.now() / 1000))
        } catch (error) {
          const failure = error instanceof MailSendError ? error : new MailSendError(error instanceof Error ? error.message : String(error), false)
          const status = await this.outbox.markFailed(row, failure.message, failure.permanent, Math.floor(Date.now() / 1000))
          this.logger.warn(`mail ${row.id} to ${row.toEmail} ${status === 'failed' ? 'failed' : 'will retry'}: ${failure.message}`)
        }
      }
      if (rows.length < BATCH) break
    }
    if (handled) await this.outbox.cleanup(Math.floor(Date.now() / 1000))
    return handled
  }
}
