import { HttpException, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cleanFilename, detectUploadType } from '../ai/upload-types'
import { configuration } from '../config/configuration'
import { readyTool } from '../mcp/tool-catalog'
import { ASSET_ID, LANDING_KEY, LandingInputError, assetIdsOf, cleanText, parseLandingDoc, type LandingDoc } from './landing-content'
import { defaultLandingDoc } from './landing-defaults'
import { LandingsRepository, type LandingRow, type LandingSummary } from './landings.repository'

// GIF is accepted for chat but not here: an animated banner is not what these pages are for.
const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
// Hard ceiling for the route body limit, which is fixed when the module loads; the env setting may only lower it.
export const LANDING_ASSET_MAX_BYTES = 10 * 1024 * 1024

export function landingError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ ok: false, code, message, ...extra }, status)
}

const now = () => Math.floor(Date.now() / 1000)

const summaryOf = (row: LandingSummary) => ({ ...row, published: row.publishedRev !== null, unpublishedChanges: row.publishedRev !== row.rev })

@Injectable()
export class LandingsService {
  constructor(private readonly repository: LandingsRepository) {}

  private get config() { return configuration().landings }

  private key(value: unknown) {
    if (typeof value !== 'string' || !LANDING_KEY.test(value)) landingError(404, 'NOT_FOUND', 'Không có trang giới thiệu này.')
    return value
  }

  private async existing(key: unknown): Promise<LandingRow> {
    const row = await this.repository.find(this.key(key))
    if (!row) landingError(404, 'NOT_FOUND', 'Không có trang giới thiệu này.')
    return row
  }

  private name(value: unknown) {
    try { return cleanText(value, 'name', 120, true) } catch (error) { return this.invalid(error) }
  }

  private invalid(error: unknown): never {
    if (error instanceof LandingInputError) landingError(400, 'INVALID_INPUT', error.message, { field: error.field })
    throw error
  }

  /** Pictures must already be uploaded: a page never points at a file the server does not hold. */
  private async checkedDoc(input: unknown): Promise<LandingDoc> {
    let doc: LandingDoc
    try { doc = parseLandingDoc(input, { readyTool: (slug) => readyTool(slug) !== null }) } catch (error) { return this.invalid(error) }
    const ids = assetIdsOf(doc)
    const found = await this.repository.existingAssets(ids)
    if (ids.some((id) => !found.has(id))) landingError(400, 'INVALID_INPUT', 'Có ảnh không còn trên máy chủ. Hãy tải ảnh lên lại.')
    return doc
  }

  private conflict(row: LandingRow): never {
    landingError(409, 'LANDING_CONFLICT', `Trang này vừa được ${row.updatedBy} sửa. Tải lại để xem bản mới nhất.`, { landing: summaryOf(row) })
  }

  private revOf(value: unknown) {
    if (!Number.isInteger(value)) landingError(400, 'INVALID_INPUT', 'Thiếu phiên bản của trang.')
    return value as number
  }

  async published(key: string) {
    const found = LANDING_KEY.test(key) ? await this.repository.findPublished(key) : null
    if (!found) landingError(404, 'NOT_FOUND', 'Không có trang giới thiệu này.')
    return { ok: true, landing: { key, publishedAt: found.publishedAt, ...found.doc } }
  }

  async list() {
    return { ok: true, landings: (await this.repository.list()).map(summaryOf) }
  }

  async get(key: unknown) {
    const row = await this.existing(key)
    return { ok: true, landing: { ...summaryOf(row), draft: row.draft, publishedContent: row.published } }
  }

  async create(rawKey: unknown, rawName: unknown, actor: string) {
    if (typeof rawKey !== 'string' || !LANDING_KEY.test(rawKey)) landingError(400, 'INVALID_INPUT', 'Mã trang chỉ gồm chữ thường không dấu, số và dấu gạch ngang (tối đa 40 ký tự).', { field: 'key' })
    const name = this.name(rawName)
    if (!await this.repository.create(rawKey, name, defaultLandingDoc(), actor, now())) landingError(409, 'LANDING_EXISTS', 'Mã trang này đã có.', { field: 'key' })
    return this.get(rawKey)
  }

  async saveDraft(key: unknown, input: { name: unknown; draft: unknown; baseRev: unknown }, actor: string) {
    const row = await this.existing(key)
    const baseRev = this.revOf(input.baseRev)
    const name = input.name === undefined ? row.name : this.name(input.name)
    const draft = await this.checkedDoc(input.draft)
    if (baseRev !== row.rev || !await this.repository.saveDraft(row.key, baseRev, { name, draft, actor, at: now() })) this.conflict(await this.existing(row.key))
    return this.get(row.key)
  }

  async publish(key: unknown, rawRev: unknown, actor: string) {
    const row = await this.existing(key)
    const baseRev = this.revOf(rawRev)
    // A draft saved before a tool was retired would publish a dead link; check it again now.
    await this.checkedDoc(row.draft)
    if (baseRev !== row.rev || !await this.repository.publish(row.key, baseRev, actor, now())) this.conflict(await this.existing(row.key))
    return this.get(row.key)
  }

  async unpublish(key: unknown) {
    const row = await this.existing(key)
    await this.repository.unpublish(row.key)
    return this.get(row.key)
  }

  private pathOf(id: string) { return join(this.config.assetDir, id) }

  async uploadAsset(rawName: unknown, body: unknown, actor: string) {
    const { assetMaxBytes, assetDir } = this.config
    if (!Buffer.isBuffer(body)) landingError(415, 'UPLOAD_TYPE', 'Ảnh phải được gửi nguyên dạng (application/octet-stream).')
    if (body.length > assetMaxBytes) landingError(413, 'UPLOAD_TOO_LARGE', `Ảnh vượt quá ${Math.floor(assetMaxBytes / 1048576)} MB.`)
    let decoded = ''
    try { decoded = typeof rawName === 'string' ? decodeURIComponent(rawName) : '' } catch { decoded = '' }
    const mimeType = detectUploadType(cleanFilename(decoded), body)
    // No SVG on purpose: it can carry script, and these files are served from the site's own origin.
    if (!mimeType || !PICTURE_TYPES.includes(mimeType)) landingError(415, 'UPLOAD_TYPE', 'Chỉ nhận ảnh PNG, JPG hoặc WebP.')
    const id = createHash('sha256').update(body).digest('hex')
    const path = this.pathOf(id)
    await mkdir(assetDir, { recursive: true })
    // Write-then-rename so a half-written file is never served under its final name.
    if (!await access(path).then(() => true, () => false)) {
      const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temporary, body, { mode: 0o644 })
      try { await rename(temporary, path) } catch (error) {
        await rm(temporary, { force: true })
        throw error
      }
    }
    await this.repository.addAsset({ id, mimeType, size: body.length }, actor, now())
    return { ok: true, asset: { id, mimeType, size: body.length } }
  }

  async openAsset(id: string) {
    const asset = ASSET_ID.test(id) ? await this.repository.findAsset(id) : null
    // A row whose file was lost (restored DB, wiped folder) answers 404 instead of a stream that dies after the headers.
    if (!asset || !await stat(this.pathOf(asset.id)).then((file) => file.isFile(), () => false)) return null
    return { asset, stream: createReadStream(this.pathOf(asset.id)) }
  }
}
