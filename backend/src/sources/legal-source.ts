import { isIP } from 'node:net'
import { isSourceId } from './source-id'

export const SOURCE_STATUSES = ['draft', 'verified', 'superseded', 'revoked'] as const
export type SourceStatus = (typeof SOURCE_STATUSES)[number]

export interface LegalSourceFields {
  issuer: string
  documentNumber: string
  jurisdiction: string
  article: string | null
  validFrom: string | null
  validTo: string | null
  checkedAt: string
  reviewer: string
  evidenceUrl: string
  status: SourceStatus
}

export interface LegalSource extends LegalSourceFields {
  sourceId: string
  createdBy: string
  createdAt: number
  updatedBy: string
  updatedAt: number
}

/** Carries the offending field so the admin client can point at it. */
export class SourceInputError extends Error {
  constructor(readonly field: string, message: string) { super(message) }
}

const FIELDS = ['issuer', 'documentNumber', 'jurisdiction', 'article', 'validFrom', 'validTo', 'checkedAt', 'reviewer', 'evidenceUrl', 'status']

function text(value: unknown, field: string, min: number, max: number): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (trimmed.length < min || trimmed.length > max) throw new SourceInputError(field, `${field} must be ${min}-${max} characters`)
  return trimmed
}

function date(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new SourceInputError(field, `${field} must be YYYY-MM-DD`)
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new SourceInputError(field, `${field} is not a real date`)
  return value
}

const optionalDate = (value: unknown, field: string) => value === null || value === undefined || value === '' ? null : date(value, field)

// Evidence links are shown to every visitor; plain http, credentials and private hosts are refused.
function evidenceUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new SourceInputError('evidenceUrl', 'evidenceUrl must be an https URL')
  let url: URL
  try { url = new URL(value) } catch { throw new SourceInputError('evidenceUrl', 'evidenceUrl must be an https URL') }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (url.protocol !== 'https:' || url.username || url.password || !host || host === 'localhost' || host.endsWith('.localhost') || isIP(host) !== 0) {
    throw new SourceInputError('evidenceUrl', 'evidenceUrl must be a public https URL without credentials')
  }
  return url.href
}

export function parseSourceId(value: unknown): string {
  if (!isSourceId(value)) throw new SourceInputError('sourceId', 'sourceId must be 3-64 lowercase letters, digits or dashes')
  return value
}

/** `today` is the Vietnam calendar date: a check date after it is a typo, not a future check. */
export function parseLegalSourceFields(value: unknown, today: string): LegalSourceFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SourceInputError('body', 'Body must be a JSON object')
  const input = value as Record<string, unknown>
  const unknown = Object.keys(input).find(key => !FIELDS.includes(key))
  if (unknown) throw new SourceInputError(unknown, `Unknown field ${unknown}`)
  const validFrom = optionalDate(input.validFrom, 'validFrom')
  const validTo = optionalDate(input.validTo, 'validTo')
  if (validFrom && validTo && validTo < validFrom) throw new SourceInputError('validTo', 'validTo must not be before validFrom')
  const checkedAt = date(input.checkedAt, 'checkedAt')
  if (checkedAt > today) throw new SourceInputError('checkedAt', 'checkedAt must not be in the future')
  if (typeof input.status !== 'string' || !(SOURCE_STATUSES as readonly string[]).includes(input.status)) throw new SourceInputError('status', `status must be one of ${SOURCE_STATUSES.join(', ')}`)
  return {
    issuer: text(input.issuer, 'issuer', 2, 200),
    documentNumber: text(input.documentNumber, 'documentNumber', 1, 100),
    jurisdiction: text(input.jurisdiction, 'jurisdiction', 2, 100),
    article: input.article === null || input.article === undefined || input.article === '' ? null : text(input.article, 'article', 1, 200),
    validFrom,
    validTo,
    checkedAt,
    reviewer: text(input.reviewer, 'reviewer', 2, 128),
    evidenceUrl: evidenceUrl(input.evidenceUrl),
    status: input.status as SourceStatus,
  }
}

/** What anonymous visitors see: who reviewed it and the bookkeeping columns stay internal. */
export function publicSourceView(source: LegalSource) {
  const { reviewer: _reviewer, createdBy: _createdBy, createdAt: _createdAt, updatedBy: _updatedBy, updatedAt: _updatedAt, ...shown } = source
  return shown
}
