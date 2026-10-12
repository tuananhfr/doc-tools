import { HttpException, Injectable } from '@nestjs/common'
import { vietnamToday } from '../rules/rule-dates'
import { SettingsService } from '../settings/settings.service'
import { parseLegalSourceFields, parseSourceId, publicSourceView, SourceInputError, type LegalSourceFields } from './legal-source'
import { isSourceId } from './source-id'
import { SourcesRepository } from './sources.repository'

function sourceError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ ok: false, code, message, ...extra }, status)
}

function parsed<T>(read: () => T): T {
  try { return read() } catch (error) {
    if (error instanceof SourceInputError) sourceError(400, 'INVALID_INPUT', error.message, { field: error.field })
    throw error
  }
}

const now = () => Math.floor(Date.now() / 1000)

@Injectable()
export class SourcesService {
  constructor(private readonly repository: SourcesRepository, private readonly settings: SettingsService) {}

  /** Drafts answer 404 like a missing id, so an unfinished entry never reaches a tool page. */
  async publicSource(rawId: string) {
    const source = isSourceId(rawId) ? await this.repository.get(rawId) : null
    if (!source || source.status === 'draft') sourceError(404, 'SOURCE_NOT_FOUND', 'Không có nguồn này.')
    return { ok: true, source: publicSourceView(source), staleDays: await this.settings.get('sources.staleDays') }
  }

  async list() { return { ok: true, items: await this.repository.list() } }

  async get(rawId: string) {
    const source = isSourceId(rawId) ? await this.repository.get(rawId) : null
    if (!source) sourceError(404, 'SOURCE_NOT_FOUND', 'Không có nguồn này.')
    return { ok: true, source }
  }

  async create(input: unknown, actor: string) {
    const record = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
    const { sourceId: rawId, ...rest } = record
    const sourceId = parsed(() => parseSourceId(rawId))
    const fields: LegalSourceFields = parsed(() => parseLegalSourceFields(rest, vietnamToday()))
    if (!await this.repository.create(sourceId, fields, actor, now())) sourceError(409, 'SOURCE_EXISTS', 'Mã nguồn đã có.')
    return { ok: true, source: (await this.repository.get(sourceId))! }
  }

  async update(rawId: string, input: unknown, actor: string) {
    const sourceId = parsed(() => parseSourceId(rawId))
    const fields = parsed(() => parseLegalSourceFields(input, vietnamToday()))
    if (!await this.repository.update(sourceId, fields, actor, now())) sourceError(404, 'SOURCE_NOT_FOUND', 'Không có nguồn này.')
    return { ok: true, source: (await this.repository.get(sourceId))! }
  }
}
