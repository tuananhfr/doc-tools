import { HttpException, HttpStatus } from '@nestjs/common'
import type { AuthFloodRepository } from './auth-flood.repository'
import { authHash } from './auth-hash'

export interface RateRule { limit: number; window: number }

export async function enforceLimit(flood: AuthFloodRepository, key: string, rule: RateRule, at: number) {
  if (!await flood.hit(authHash(key), rule.limit, rule.window, at)) {
    throw new HttpException({ ok: false, code: 'RATE_LIMITED', message: 'Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.' }, HttpStatus.TOO_MANY_REQUESTS)
  }
}
