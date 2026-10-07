import { Injectable } from '@nestjs/common'
import { parseSettingValue, SETTINGS, type SettingKey, type SettingValue } from './settings.definitions'
import { SettingsRepository, type StoredSetting } from './settings.repository'

// Other API instances pick up an admin change within this window; the instance that saved it sees it at once.
const CACHE_MS = 30000

/** A stored value that no longer fits its definition (limits tightened in code) falls back to the default. */
function resolve(key: SettingKey, stored: StoredSetting | undefined) {
  return (stored ? parseSettingValue(key, stored.value) : null) ?? SETTINGS[key].default
}

@Injectable()
export class SettingsService {
  private cache: { at: number; rows: Map<string, StoredSetting> } | null = null

  constructor(private readonly repository: SettingsRepository) {}

  private async rows() {
    if (!this.cache || Date.now() - this.cache.at > CACHE_MS) {
      this.cache = { at: Date.now(), rows: new Map((await this.repository.all()).map((row) => [row.key, row])) }
    }
    return this.cache.rows
  }

  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    return resolve(key, (await this.rows()).get(key)) as SettingValue<K>
  }

  async list() {
    const rows = await this.rows()
    return (Object.keys(SETTINGS) as SettingKey[]).map((key) => {
      const stored = rows.get(key)
      return { key, ...SETTINGS[key], value: resolve(key, stored), overridden: Boolean(stored), updatedBy: stored?.updatedBy ?? null, updatedAt: stored?.updatedAt ?? null }
    })
  }

  async set(key: SettingKey, value: boolean | number | string[], actor: string) {
    await this.repository.set(key, value, actor)
    this.cache = null
  }

  async reset(key: SettingKey) {
    await this.repository.reset(key)
    this.cache = null
  }
}
