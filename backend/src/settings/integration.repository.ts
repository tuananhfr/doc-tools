import { Injectable } from '@nestjs/common'
import type { RowDataPacket } from 'mysql2/promise'
import { SECRET_NAMES, type RuntimeOverrides, type SecretName } from '../config/runtime-config'
import { openSecret } from '../config/secret-box'
import { DatabaseService } from '../database/database.service'
import { GROUP_ROW, INTEGRATION_GROUPS, storedGroup, type IntegrationGroup } from './integration.definitions'

export interface StoredMeta { updatedBy: string; updatedAt: string }

export interface IntegrationSnapshot {
  overrides: RuntimeOverrides
  groups: Partial<Record<IntegrationGroup, StoredMeta>>
  /** `readable: false` = a row exists but the key is missing or changed since it was sealed. */
  secrets: Partial<Record<SecretName, StoredMeta & { readable: boolean }>>
}

const iso = (value: unknown) => (value as Date).toISOString()

@Injectable()
export class IntegrationRepository {
  constructor(private readonly database: DatabaseService) {}

  async snapshot(): Promise<IntegrationSnapshot> {
    const keys = INTEGRATION_GROUPS.map((group) => GROUP_ROW[group])
    const [settingRows] = await this.database.pool.query<RowDataPacket[]>('SELECT setting_key, value, updated_by, updated_at FROM app_settings WHERE setting_key IN (?)', [keys])
    const [secretRows] = await this.database.pool.query<RowDataPacket[]>('SELECT secret_key, sealed, updated_by, updated_at FROM app_secrets')
    const snapshot: IntegrationSnapshot = { overrides: { mail: null, goclaw: null, secrets: {} }, groups: {}, secrets: {} }
    for (const group of INTEGRATION_GROUPS) {
      const row = settingRows.find((item) => item.setting_key === GROUP_ROW[group])
      if (!row) continue
      const parsed = storedGroup(group, row.value)
      if (!parsed) continue
      if (group === 'mail') snapshot.overrides.mail = parsed as RuntimeOverrides['mail']
      else snapshot.overrides.goclaw = parsed as RuntimeOverrides['goclaw']
      snapshot.groups[group] = { updatedBy: row.updated_by as string, updatedAt: iso(row.updated_at) }
    }
    for (const row of secretRows) {
      const name = row.secret_key as SecretName
      if (!(SECRET_NAMES as readonly string[]).includes(name)) continue
      const plain = openSecret(name, row.sealed as string)
      if (plain !== null) snapshot.overrides.secrets[name] = plain
      snapshot.secrets[name] = { updatedBy: row.updated_by as string, updatedAt: iso(row.updated_at), readable: plain !== null }
    }
    return snapshot
  }

  async setGroup(group: IntegrationGroup, values: unknown, actor: string) {
    await this.database.pool.execute('INSERT INTO app_settings (setting_key, value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP', [GROUP_ROW[group], JSON.stringify(values), actor])
  }

  async removeGroup(group: IntegrationGroup) { await this.database.pool.execute('DELETE FROM app_settings WHERE setting_key = ?', [GROUP_ROW[group]]) }

  async setSecret(name: SecretName, sealed: string, actor: string) {
    await this.database.pool.execute('INSERT INTO app_secrets (secret_key, sealed, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sealed = VALUES(sealed), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP', [name, sealed, actor])
  }

  async removeSecrets(names: readonly SecretName[]) {
    if (names.length) await this.database.pool.query('DELETE FROM app_secrets WHERE secret_key IN (?)', [names])
  }
}
