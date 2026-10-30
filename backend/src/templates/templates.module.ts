import { Module } from '@nestjs/common'
import { TemplatesController } from './templates.controller'
import { TemplatesService } from './templates.service'

// SettingsService comes from the @Global() SettingsModule — no import needed here.
@Module({ controllers: [TemplatesController], providers: [TemplatesService] })
export class TemplatesModule {}
