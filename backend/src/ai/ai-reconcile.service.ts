import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PlansRepository } from '../accounts/plans.repository'
import { AiRepository } from './ai.repository'
import { AiService, setupIntact } from './ai.service'
import { GoclawClient } from './goclaw.client'

const FIRST_RUN_MS = 300_000
const EVERY_MS = 3_600_000

export type ReconcileOutcome = 'ok' | 'skipped' | 'expired' | 'drift' | 'stray'

export interface ReconcileSummary {
  at: number
  checked: number
  expired: number
  drift: number
  stray: number
  errors: number
}

const now = () => Math.floor(Date.now() / 1000)

/**
 * Hourly comparison of our records with GoClaw (docs/pro/pro-spec.md §6.4). Tickets already re-check
 * on every chat, but an agent nobody opens could sit on a removed provider and fall back onto another
 * tenant key, or keep running after Pro ended. Every fix only ever switches an agent OFF.
 */
@Injectable()
export class AiReconcileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AiReconcile')
  private timers: ReturnType<typeof setTimeout>[] = []
  private running = false
  lastRun: ReconcileSummary | null = null

  constructor(private readonly repository: AiRepository, private readonly goclaw: GoclawClient, private readonly ai: AiService, private readonly plans: PlansRepository) {}

  onModuleInit() {
    if (!this.goclaw.configured()) return
    const tick = () => void this.reconcileAll().catch((error) => this.logger.error(error))
    const first = setTimeout(() => { tick(); const every = setInterval(tick, EVERY_MS); every.unref(); this.timers.push(every) }, FIRST_RUN_MS)
    first.unref()
    this.timers.push(first)
  }

  onModuleDestroy() { for (const timer of this.timers) clearTimeout(timer) }

  async reconcileAll(at = now()) {
    if (this.running || !this.goclaw.configured()) return this.lastRun
    this.running = true
    const summary: ReconcileSummary = { at, checked: 0, expired: 0, drift: 0, stray: 0, errors: 0 }
    try {
      for (const agent of await this.repository.agentsInGoclaw()) {
        summary.checked++
        try {
          const outcome = await this.reconcileUser(agent.userId, at)
          if (outcome === 'expired' || outcome === 'drift' || outcome === 'stray') summary[outcome]++
        } catch (error) {
          // GoClaw unreachable or refusing: change nothing for this member, try again next hour.
          summary.errors++
          this.logger.warn(`${agent.agentKey}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      if (summary.expired || summary.drift || summary.stray || summary.errors) this.logger.log(JSON.stringify(summary))
      this.lastRun = summary
      return summary
    } finally { this.running = false }
  }

  async reconcileUser(userId: string, at = now()): Promise<ReconcileOutcome> {
    const [provider, agent] = await Promise.all([this.repository.provider(userId), this.repository.agent(userId)])
    if (!agent?.goclawAgentId) return 'skipped'
    const agentId = agent.goclawAgentId
    const remoteAgent = await this.goclaw.getAgent(agentId)
    if (agent.status === 'inactive') {
      if (remoteAgent?.status !== 'active') return 'ok'
      await this.goclaw.updateAgent(agentId, { status: 'inactive' })
      return 'stray'
    }
    // Provider stays as it is, so a renewal resumes on the next ticket without asking for the key again.
    if (await this.plans.proEndsAt(userId, at) === null) {
      if (remoteAgent) await this.goclaw.updateAgent(agentId, { status: 'inactive' })
      await this.repository.setAgentStatus(userId, 'inactive')
      return 'expired'
    }
    const remoteProvider = provider?.goclawProviderId ? await this.goclaw.getProvider(provider.goclawProviderId) : null
    if (provider && setupIntact(provider, remoteProvider, remoteAgent)) return 'ok'
    await this.ai.markDrifted(userId, agentId, Boolean(remoteAgent))
    return 'drift'
  }
}
