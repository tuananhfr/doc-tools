import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { RulesRepository } from './rules.repository'
import { verifyRulePackage } from './rule-package'

@Injectable()
export class RulesService {
  constructor(private readonly repository: RulesRepository) {}

  async active(kind: string) {
    const publicKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
    if (!publicKey) throw new ServiceUnavailableException({ ok: false, message: 'Kho quy tắc chưa được cấu hình.' })
    const value = await this.repository.getActive(kind)
    if (!value) return { ok: true, package: null }
    try { verifyRulePackage(value, publicKey) }
    catch { throw new ServiceUnavailableException({ ok: false, message: 'Không xác minh được gói quy tắc.' }) }
    return { ok: true, package: value }
  }
}
