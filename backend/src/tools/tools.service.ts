import { Injectable } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { configuration } from '../config/configuration'
import { ToolsRepository } from './tools.repository'
@Injectable()
export class ToolsService {
  constructor(private readonly repository: ToolsRepository) {}
  async visit(tool: string, ip: string) {
    const hash = createHmac('sha256', configuration().visitHashSecret).update(ip).digest('hex')
    await this.repository.record(tool, hash, Math.floor(Date.now() / 1000))
    return { ok: true }
  }
  async stats() { return { ok: true, ...await this.repository.stats() } }
}
