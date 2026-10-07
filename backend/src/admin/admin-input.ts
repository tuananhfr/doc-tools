import { BadRequestException } from '@nestjs/common'

export const ADMIN_PAGE_SIZE = 25

export function invalid(message: string, code = 'INVALID_INPUT'): never {
  throw new BadRequestException({ ok: false, code, message })
}

export function parsePage(value: unknown) {
  if (value === undefined) return 1
  const page = Number(value)
  if (!Number.isInteger(page) || page < 1 || page > 10000) invalid('Số trang không hợp lệ.')
  return page
}

export function parseUuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) invalid('Mã không hợp lệ.')
  return value
}

/** `undefined` and `''` mean "no filter"; anything else must be one of `allowed`. */
export function parseChoice<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) invalid('Bộ lọc không hợp lệ.')
  return value as T
}

export function parseNote(value: unknown, max: number, required = false): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) invalid('Cần ghi chú.', 'NOTE_REQUIRED')
    return null
  }
  if (typeof value !== 'string') invalid('Ghi chú không hợp lệ.')
  const note = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()
  if (note.length > max) invalid(`Ghi chú tối đa ${max} ký tự.`)
  if (required && !note) invalid('Cần ghi chú.', 'NOTE_REQUIRED')
  return note || null
}

/** `LIKE` treats `%` and `_` as wildcards; a search box must match them literally. */
export function likePattern(value: string) { return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%` }

export function body(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Body phải là JSON.')
  return value as Record<string, unknown>
}
