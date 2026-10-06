import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { RulesRepository } from './rules.repository'
import { verifyRulePackage } from './rule-package'
import { vietnamToday } from './rule-dates'

@Injectable()
export class RulesService {
  constructor(private readonly repository: RulesRepository) {}

  async active(kind: string) {
    const publicKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
    if (!publicKey) throw new ServiceUnavailableException({ ok: false, message: 'Kho quy tắc chưa được cấu hình.' })
    const today = vietnamToday()
    const [value, next] = await Promise.all([this.repository.getEffective(kind, today), this.repository.getUpcoming(kind, today)])
    if (value) {
      try { verifyRulePackage(value, publicKey) }
      catch { throw new ServiceUnavailableException({ ok: false, message: 'Không xác minh được gói quy tắc.' }) }
    }
    // Upcoming is only a notice; a package that fails verification is left out rather than breaking today's rules.
    let upcoming = null
    if (next) {
      try { verifyRulePackage(next, publicKey); upcoming = next }
      catch { upcoming = null }
    }
    return { ok: true, package: value, upcoming }
  }
}
