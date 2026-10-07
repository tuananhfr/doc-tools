import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import { isSettingKey, parseSettingValue } from '../settings/settings.definitions'
import { SettingsService } from '../settings/settings.service'
import { AdminAuditRepository } from './admin-audit.repository'
import { body, invalid } from './admin-input'
import { Actor, Staff, type StaffActor } from './admin.guard'
import { systemStatus } from './system-status'

function key(value: string) {
  if (!isSettingKey(value)) invalid('Không có cài đặt này.')
  return value
}

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService, private readonly audit: AdminAuditRepository) {}

  @Get()
  @Staff('settings.manage')
  async list() { return { ok: true, settings: await this.settings.list(), system: systemStatus() } }

  @Put(':key')
  @Staff('settings.manage')
  @RouteConfig({ bodyLimit: 2048 })
  async update(@Actor() actor: StaffActor, @Param('key') name: string, @Body() input: unknown) {
    const settingKey = key(name)
    const value = parseSettingValue(settingKey, body(input).value)
    if (value === null) invalid('Giá trị nằm ngoài khoảng cho phép.')
    await this.settings.set(settingKey, value, actor.label)
    await this.audit.record(actor, 'SETTING_CHANGED', 'setting', settingKey, JSON.stringify(value))
    return this.list()
  }

  @Delete(':key')
  @Staff('settings.manage')
  async reset(@Actor() actor: StaffActor, @Param('key') name: string) {
    const settingKey = key(name)
    await this.settings.reset(settingKey)
    await this.audit.record(actor, 'SETTING_RESET', 'setting', settingKey)
    return this.list()
  }
}
