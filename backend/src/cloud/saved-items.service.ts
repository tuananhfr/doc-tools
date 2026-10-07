import { HttpException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { readyTool } from '../mcp/tool-catalog'
import { SettingsService } from '../settings/settings.service'
import { SavedItemsRepository, type SavedItem, type SavedMeta } from './saved-items.repository'

export const MAX_PAYLOAD_BYTES = 256 * 1024
const MAX_TITLE = 120

export function cloudError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): never {
  throw new HttpException({ ok: false, code, message, ...extra }, status)
}

const now = () => Math.floor(Date.now() / 1000)

function cleanTitle(value: unknown) {
  if (typeof value !== 'string') return null
  const title = value.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim()
  return title && [...title].length <= MAX_TITLE ? title : null
}

function toolOf(value: unknown) {
  return typeof value === 'string' && readyTool(value) ? value : null
}

/** A saved result is whatever the tool page chose to keep: any plain JSON object, checked again on restore. */
function encodePayload(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const json = JSON.stringify(value)
  return { json, size: Buffer.byteLength(json) }
}

@Injectable()
export class SavedItemsService {
  constructor(private readonly repository: SavedItemsRepository, private readonly settings: SettingsService) {}

  private async limits() {
    const [maxItems, maxMegabytes] = await Promise.all([this.settings.get('cloud.maxItems'), this.settings.get('cloud.maxMegabytes')])
    return { maxItems, maxBytes: maxMegabytes * 1024 * 1024 }
  }

  /**
   * Checked before the write, not inside it: two saves landing together can overshoot by one item. The
   * cap guards against runaway use, not against an exact count.
   */
  private async ensureRoom(userId: string, addItems: number, addBytes: number) {
    const [usage, limits] = await Promise.all([this.repository.usage(userId), this.limits()])
    if (addItems > 0 && usage.items + addItems > limits.maxItems) cloudError(409, 'CLOUD_QUOTA', `Bạn đã lưu tối đa ${limits.maxItems} mục. Hãy xoá bớt mục cũ.`)
    if (addBytes > 0 && usage.bytes + addBytes > limits.maxBytes) cloudError(409, 'CLOUD_QUOTA', 'Dung lượng đã lưu đã đầy. Hãy xoá bớt mục cũ.')
  }

  async list(userId: string, writable: boolean) {
    const [items, usage, limits] = await Promise.all([this.repository.list(userId), this.repository.usage(userId), this.limits()])
    return { ok: true, items, usage: { ...usage, ...limits }, writable }
  }

  async get(userId: string, id: string) {
    const item = await this.repository.find(userId, id)
    if (!item) cloudError(404, 'NOT_FOUND', 'Mục này không còn (có thể đã bị xoá ở thiết bị khác).')
    return { ok: true, item }
  }

  async saveResult(userId: string, input: { toolId: unknown; title: unknown; payload: unknown }) {
    const toolId = toolOf(input.toolId)
    const title = cleanTitle(input.title)
    const payload = encodePayload(input.payload)
    if (!toolId || !title || !payload) cloudError(400, 'INVALID_INPUT', 'Dữ liệu cần lưu không hợp lệ.')
    if (payload.size > MAX_PAYLOAD_BYTES) cloudError(413, 'CLOUD_ITEM_TOO_LARGE', 'Kết quả này quá lớn để lưu (tối đa 256 KB).')
    await this.ensureRoom(userId, 1, payload.size)
    const at = now()
    const item: SavedItem = { id: randomUUID(), kind: 'result', toolId, title, size: payload.size, rev: 1, createdAt: at, updatedAt: at, payload: input.payload }
    await this.repository.create(userId, item, payload.json)
    return { ok: true, item: this.meta(item) }
  }

  /**
   * `baseRev` is the revision the device last saw. A different current revision means another device
   * wrote in between: answer 409 with the server copy so the person decides, unless `force` says
   * they already chose to overwrite.
   */
  async update(userId: string, id: string, input: { title?: unknown; payload?: unknown; baseRev: unknown; force?: unknown }) {
    const current = await this.repository.find(userId, id)
    if (!current) cloudError(404, 'NOT_FOUND', 'Mục này không còn (có thể đã bị xoá ở thiết bị khác).')
    if (!Number.isInteger(input.baseRev)) cloudError(400, 'INVALID_INPUT', 'Thiếu phiên bản của mục.')
    if (current.kind !== 'result') cloudError(400, 'INVALID_INPUT', 'Không sửa được mục này.')
    const title = input.title === undefined ? current.title : cleanTitle(input.title)
    const payload = input.payload === undefined ? { json: JSON.stringify(current.payload), size: current.size } : encodePayload(input.payload)
    if (!title || !payload) cloudError(400, 'INVALID_INPUT', 'Dữ liệu cần lưu không hợp lệ.')
    if (payload.size > MAX_PAYLOAD_BYTES) cloudError(413, 'CLOUD_ITEM_TOO_LARGE', 'Kết quả này quá lớn để lưu (tối đa 256 KB).')
    const conflict = () => cloudError(409, 'SAVED_CONFLICT', 'Mục này vừa được sửa ở thiết bị khác.', { item: this.meta(current) })
    if (input.baseRev !== current.rev && input.force !== true) conflict()
    await this.ensureRoom(userId, 0, payload.size - current.size)
    const updatedAt = now()
    if (!await this.repository.update(userId, id, current.rev, { title, payloadJson: payload.json, size: payload.size, updatedAt })) conflict()
    return { ok: true, item: { ...this.meta(current), title, size: payload.size, rev: current.rev + 1, updatedAt } }
  }

  async remove(userId: string, id: string) {
    if (!await this.repository.remove(userId, id)) cloudError(404, 'NOT_FOUND', 'Mục này không còn (có thể đã bị xoá ở thiết bị khác).')
    return { ok: true }
  }

  /** Idempotent: starring twice, from one device or two, leaves one bookmark. */
  async bookmark(userId: string, rawToolId: string) {
    const toolId = toolOf(rawToolId)
    if (!toolId) cloudError(400, 'INVALID_INPUT', 'Công cụ không hợp lệ.')
    const existing = await this.repository.findBookmark(userId, toolId)
    if (existing) return { ok: true, item: existing }
    await this.ensureRoom(userId, 1, 0)
    const at = now()
    const item: SavedItem = { id: randomUUID(), kind: 'bookmark', toolId, title: toolId, size: 0, rev: 1, createdAt: at, updatedAt: at, payload: null }
    if (await this.repository.create(userId, item, null)) return { ok: true, item: this.meta(item) }
    return { ok: true, item: await this.repository.findBookmark(userId, toolId) }
  }

  async unbookmark(userId: string, rawToolId: string) {
    const existing = typeof rawToolId === 'string' ? await this.repository.findBookmark(userId, rawToolId) : null
    if (existing) await this.repository.remove(userId, existing.id)
    return { ok: true }
  }

  private meta(item: SavedItem): SavedMeta {
    const { payload: _payload, ...meta } = item
    return meta
  }
}
