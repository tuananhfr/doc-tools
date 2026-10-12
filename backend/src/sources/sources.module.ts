import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { SettingsModule } from '../settings/settings.module'
import { AdminSourcesController } from './admin-sources.controller'
import { SourcesController } from './sources.controller'
import { SourcesRepository } from './sources.repository'
import { SourcesService } from './sources.service'

@Module({
  imports: [DatabaseModule, SessionModule, AdminModule, SettingsModule],
  controllers: [SourcesController, AdminSourcesController],
  providers: [SourcesRepository, SourcesService],
  exports: [SourcesRepository],
})
export class SourcesModule {}
