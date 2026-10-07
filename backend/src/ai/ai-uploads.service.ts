import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AccountDeletionService } from '../accounts/account-deletion.service'
import { configuration } from '../config/configuration'
import { aiError } from './ai.service'
import { AiUploadsRepository, type UploadRow } from './ai-uploads.repository'
import { cleanFilename, detectUploadType } from './upload-types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/
const DAY = 86400
const now = () => Math.floor(Date.now() / 1000)
const hashOf = (token: string) => createHash('sha256').update(token).digest('hex')

const publicUpload = (upload: UploadRow) => ({ id: upload.id, filename: upload.filename, mimeType: upload.mimeType, size: upload.size, expiresAt: upload.expiresAt })

/**
 * Files a member attaches to a chat. GoClaw's own upload endpoint is not used: it needs the gateway
 * token and names files with a guessable timestamp in one shared folder. Instead the file stays here
 * and GoClaw fetches it through a one-time link that the browser passes in chat.send.
 */
@Injectable()
export class AiUploadsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AiUploadsService')
  private sweeper?: ReturnType<typeof setInterval>

  constructor(private readonly repository: AiUploadsRepository, private readonly deletion: AccountDeletionService) {}

  onModuleInit() {
    this.deletion.addCleanup('ai-uploads', (userId) => this.removeAllOf(userId))
    this.sweeper = setInterval(() => void this.sweep().catch((error) => this.logger.warn(String(error))), 3600000)
  }

  onModuleDestroy() { clearInterval(this.sweeper) }

  private get config() { return configuration().ai.uploads }

  private pathOf(id: string) { return join(this.config.dir, id) }

  async upload(userId: string, rawName: unknown, body: unknown) {
    const { maxBytes, dailyBytes, retentionDays, dir } = this.config
    if (!Buffer.isBuffer(body)) aiError(415, 'UPLOAD_TYPE', 'Tệp phải được gửi nguyên dạng (application/octet-stream).')
    if (body.length > maxBytes) aiError(413, 'UPLOAD_TOO_LARGE', `Tệp vượt quá ${Math.floor(maxBytes / 1048576)} MB.`)
    let decoded = ''
    try { decoded = typeof rawName === 'string' ? decodeURIComponent(rawName) : '' } catch { decoded = '' }
    const filename = cleanFilename(decoded)
    if (!filename) aiError(400, 'INVALID_INPUT', 'Thiếu tên tệp.')
    const mimeType = detectUploadType(filename, body)
    if (!mimeType) aiError(415, 'UPLOAD_TYPE', 'Chỉ đính kèm được ảnh PNG, JPG, WebP hoặc GIF.')
    const at = now()
    if (await this.repository.bytesSince(userId, at - DAY) + body.length > dailyBytes) aiError(429, 'UPLOAD_QUOTA', 'Bạn đã dùng hết dung lượng đính kèm trong 24 giờ qua.')

    const upload: UploadRow = { id: randomUUID(), userId, filename, mimeType, size: body.length, createdAt: at, expiresAt: at + retentionDays * DAY }
    await mkdir(dir, { recursive: true })
    await writeFile(this.pathOf(upload.id), body, { flag: 'wx', mode: 0o600 })
    try { await this.repository.create(upload) } catch (error) {
      await rm(this.pathOf(upload.id), { force: true })
      throw error
    }
    return { ok: true, upload: publicUpload(upload) }
  }

  /** A fresh link replaces the previous one; each is good for one fetch within a few minutes. */
  async link(userId: string, id: unknown) {
    const { publicApiUrl, linkTtlSeconds } = this.config
    if (!publicApiUrl) aiError(503, 'AI_UNAVAILABLE', 'Đính kèm tệp chưa được bật trên máy chủ.')
    const upload = typeof id === 'string' && UUID.test(id) ? await this.repository.find(userId, id) : null
    if (!upload) aiError(404, 'NOT_FOUND', 'Tệp đã hết hạn hoặc đã bị xoá. Hãy đính kèm lại.')
    const token = randomBytes(32).toString('base64url')
    const expiresAt = now() + linkTtlSeconds
    await this.repository.setLink(upload.id, hashOf(token), expiresAt)
    return { ok: true, url: `${publicApiUrl}/ai/uploads/${upload.id}/raw/${token}/${encodeURIComponent(upload.filename)}`, expiresAt }
  }

  /** For GoClaw's fetch: no session, the one-time token is the whole credential. */
  async open(id: string, token: string) {
    if (!UUID.test(id) || !LINK_TOKEN.test(token)) return null
    const upload = await this.repository.consumeLink(id, hashOf(token))
    return upload ? { upload, stream: createReadStream(this.pathOf(upload.id)) } : null
  }

  async remove(userId: string, id: unknown) {
    if (typeof id !== 'string' || !UUID.test(id) || !(await this.repository.markRemoved(userId, id))) aiError(404, 'NOT_FOUND', 'Không tìm thấy tệp.')
    await rm(this.pathOf(id), { force: true })
    return { ok: true }
  }

  private async drop(ids: string[]) {
    for (const id of ids) await rm(this.pathOf(id), { force: true })
    await this.repository.remove(ids)
  }

  async sweep() {
    let removed = 0
    for (let ids = await this.repository.expired(); ids.length; ids = await this.repository.expired()) {
      await this.drop(ids)
      removed += ids.length
    }
    return removed
  }

  async removeAllOf(userId: string) { await this.drop(await this.repository.idsOf(userId)) }
}
