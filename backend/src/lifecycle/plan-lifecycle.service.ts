import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { configuration } from '../config/configuration'
import { MailService } from '../mail/mail.service'
import { PlanLifecycleRepository, type NoticeKind } from './plan-lifecycle.repository'

const DAY = 86400
export const REMINDER_DAYS = 7
export const READ_ONLY_DAYS = 90
const FIRST_RUN_MS = 120_000
const EVERY_MS = 3_600_000

const now = () => Math.floor(Date.now() / 1000)

/**
 * What happens around the end of Pro (docs/pro/pro-spec.md §2): a reminder before it ends, then saved
 * items stay read-only for 90 days and are deleted only after a warning mail has had 7 days to land.
 * Without that mail nothing is deleted, however long ago Pro ended.
 */
@Injectable()
export class PlanLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PlanLifecycle')
  private timers: ReturnType<typeof setTimeout>[] = []
  private running = false

  constructor(private readonly repository: PlanLifecycleRepository, private readonly mail: MailService) {}

  onModuleInit() {
    const tick = () => void this.run().catch((error) => this.logger.error(error))
    const first = setTimeout(() => { tick(); const every = setInterval(tick, EVERY_MS); every.unref(); this.timers.push(every) }, FIRST_RUN_MS)
    first.unref()
    this.timers.push(first)
  }

  onModuleDestroy() { for (const timer of this.timers) clearTimeout(timer) }

  /** When this account's saved items will be deleted, or null while nothing is scheduled. */
  async purgeAt(userId: string, at = now()) {
    const endedAt = await this.repository.endedAt(userId, at)
    if (endedAt === null) return null
    const sentAt = await this.repository.noticeSentAt(userId, 'cloud_purge', endedAt)
    return Math.max(endedAt + READ_ONLY_DAYS * DAY, (sentAt ?? at) + REMINDER_DAYS * DAY)
  }

  /** `only` limits the run to some accounts (tests share the dev database with real data). */
  async run(at = now(), only?: ReadonlySet<string>) {
    if (this.running) return { reminded: 0, warned: 0, purged: 0 }
    this.running = true
    try {
      let reminded = 0
      let warned = 0
      let purged = 0
      const included = (userId: string) => !only || only.has(userId)
      for (const member of await this.repository.endingBetween(at, at + REMINDER_DAYS * DAY)) {
        if (!included(member.userId)) continue
        if (await this.notify(member.userId, member.email, 'pro_expiring', member.endsAt, { endsAt: member.endsAt }, at)) reminded++
      }
      for (const member of await this.repository.lapsedWithItems(at)) {
        // Disabled accounts are left for staff to decide; their data is neither mailed about nor deleted.
        if (member.endedAt === null || !member.active || !included(member.userId)) continue
        const due = member.endedAt + READ_ONLY_DAYS * DAY
        const sentAt = await this.repository.noticeSentAt(member.userId, 'cloud_purge', member.endedAt)
        if (sentAt === null) {
          if (at < due - REMINDER_DAYS * DAY) continue
          const purgeAt = Math.max(due, at + REMINDER_DAYS * DAY)
          if (await this.notify(member.userId, member.email, 'cloud_purge', member.endedAt, { purgeAt, items: member.items }, at)) warned++
        } else if (at >= Math.max(due, sentAt + REMINDER_DAYS * DAY)) {
          purged += await this.repository.purgeSaved(member.userId, at)
        }
      }
      if (reminded || warned || purged) this.logger.log(`reminded ${reminded}, warned ${warned}, purged ${purged} saved items`)
      return { reminded, warned, purged }
    } finally { this.running = false }
  }

  private async notify(userId: string, email: string, kind: NoticeKind, planEnd: number, payload: Record<string, unknown>, at: number) {
    if (!await this.repository.claimNotice(userId, kind, planEnd, at)) return false
    try {
      await this.mail.enqueue(email, kind, { ...payload, siteUrl: configuration().siteUrl })
      return true
    } catch (error) {
      await this.repository.releaseNotice(userId, kind, planEnd)
      throw error
    }
  }
}
