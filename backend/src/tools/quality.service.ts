import { Injectable } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { configuration } from '../config/configuration'
import type { QualityEvent } from './quality-input'
import { QualityRepository } from './quality.repository'

@Injectable()
export class QualityService {
  constructor(private readonly repository: QualityRepository) {}
  async record(event: QualityEvent, ip: string) {
    const now = Math.floor(Date.now() / 1000)
    const hash = createHmac('sha256', configuration().visitHashSecret).update(`quality:${Math.floor(now / 86400)}:${ip}`).digest('hex')
    await this.repository.record(event, hash, now)
    return { ok: true }
  }
}
