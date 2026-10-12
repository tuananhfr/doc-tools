import { Injectable } from '@nestjs/common'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { DatabaseService } from '../database/database.service'
import type { LegalSource, LegalSourceFields, SourceStatus } from './legal-source'

// DATE columns come back as JS Date in the server's zone; formatting in SQL keeps them plain strings.
const COLUMNS = `source_id, issuer, document_number, jurisdiction, article,
  DATE_FORMAT(valid_from, '%Y-%m-%d') AS valid_from, DATE_FORMAT(valid_to, '%Y-%m-%d') AS valid_to,
  DATE_FORMAT(checked_at, '%Y-%m-%d') AS checked_at, reviewer, evidence_url, status,
  created_by, created_at, updated_by, updated_at`

function toSource(row: RowDataPacket): LegalSource {
  return {
    sourceId: row.source_id as string, issuer: row.issuer as string, documentNumber: row.document_number as string,
    jurisdiction: row.jurisdiction as string, article: (row.article as string | null) ?? null,
    validFrom: (row.valid_from as string | null) ?? null, validTo: (row.valid_to as string | null) ?? null,
    checkedAt: row.checked_at as string, reviewer: row.reviewer as string, evidenceUrl: row.evidence_url as string,
    status: row.status as SourceStatus, createdBy: row.created_by as string, createdAt: Number(row.created_at),
    updatedBy: row.updated_by as string, updatedAt: Number(row.updated_at),
  }
}

@Injectable()
export class SourcesRepository {
  constructor(private readonly database: DatabaseService) {}

  async get(sourceId: string): Promise<LegalSource | null> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${COLUMNS} FROM legal_sources WHERE source_id = ?`, [sourceId])
    return rows[0] ? toSource(rows[0]) : null
  }

  async list(): Promise<LegalSource[]> {
    const [rows] = await this.database.pool.execute<RowDataPacket[]>(`SELECT ${COLUMNS} FROM legal_sources ORDER BY updated_at DESC, source_id`)
    return rows.map(toSource)
  }

  /** Returns false when the id is already taken. */
  async create(sourceId: string, fields: LegalSourceFields, actor: string, at: number): Promise<boolean> {
    try {
      await this.database.pool.execute(
        `INSERT INTO legal_sources (source_id, issuer, document_number, jurisdiction, article, valid_from, valid_to, checked_at, reviewer, evidence_url, status, created_by, created_at, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sourceId, fields.issuer, fields.documentNumber, fields.jurisdiction, fields.article, fields.validFrom, fields.validTo, fields.checkedAt, fields.reviewer, fields.evidenceUrl, fields.status, actor, at, actor, at],
      )
      return true
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return false
      throw error
    }
  }

  /** Returns false when no row has that id. */
  async update(sourceId: string, fields: LegalSourceFields, actor: string, at: number): Promise<boolean> {
    const [result] = await this.database.pool.execute<ResultSetHeader>(
      `UPDATE legal_sources SET issuer = ?, document_number = ?, jurisdiction = ?, article = ?, valid_from = ?, valid_to = ?, checked_at = ?, reviewer = ?, evidence_url = ?, status = ?, updated_by = ?, updated_at = ?
       WHERE source_id = ?`,
      [fields.issuer, fields.documentNumber, fields.jurisdiction, fields.article, fields.validFrom, fields.validTo, fields.checkedAt, fields.reviewer, fields.evidenceUrl, fields.status, actor, at, sourceId],
    )
    return result.affectedRows === 1
  }
}
