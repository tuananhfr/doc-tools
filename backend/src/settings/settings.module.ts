import { Global, Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { IntegrationConfigService } from './integration-config.service'
import { IntegrationRepository } from './integration.repository'
import { SettingsRepository } from './settings.repository'
import { SettingsService } from './settings.service'

// Global: limits are read by many modules, and one shared instance keeps one cache per process.
@Global()
@Module({ imports: [DatabaseModule], providers: [SettingsRepository, SettingsService, IntegrationRepository, IntegrationConfigService], exports: [SettingsService, IntegrationConfigService] })
export class SettingsModule {}
